'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from './QuestionCard';
import QuizPopup from './QuizPopup';
import WineGlassProgress from './WineGlassProgress';
import { WineQuiz, StudyArea, QuizType, QuizResult } from '@/lib/types';
import { getQuizMessage, calculateQuizResult } from '@/lib/quiz';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface QuizRunnerProps {
  quizType: QuizType;
  studyArea: StudyArea;
}

export default function QuizRunner({ quizType, studyArea }: QuizRunnerProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<WineQuiz[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupVariant, setPopupVariant] = useState<'correct' | 'wrong' | 'complete_90' | 'complete_70' | 'fail'>('correct');
  const [timeLeft, setTimeLeft] = useState(quizType === 'pop' ? 60 : null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);

  // Load questions
  useEffect(() => {
    loadQuestions();
  }, [studyArea, quizType]);

  // Timer for pop quiz
  useEffect(() => {
    if (quizType === 'pop' && timeLeft !== null && timeLeft > 0 && !quizComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quizType === 'pop' && timeLeft === 0) {
      finishQuiz();
    }
  }, [timeLeft, quizType, quizComplete]);

  const loadQuestions = async () => {
    try {
      const usedQuestionsParam = usedQuestionIds.length > 0 ? `&used_questions=${usedQuestionIds.join(',')}` : '';
      const response = await fetch(`/api/quiz?study_area=${encodeURIComponent(studyArea)}&type=${quizType}${usedQuestionsParam}`);
      const data = await response.json();
      setQuestions(data.items || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdditionalQuestions = async () => {
    try {
      const usedQuestionsParam = usedQuestionIds.length > 0 ? `&used_questions=${usedQuestionIds.join(',')}` : '';
      const response = await fetch(`/api/quiz?study_area=${encodeURIComponent(studyArea)}&type=${quizType}${usedQuestionsParam}`);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setQuestions(prev => [...prev, ...data.items]);
      }
    } catch (error) {
      console.error('Failed to load additional questions:', error);
    }
  };

  const handleAnswer = useCallback(async (choice: 'A' | 'B' | 'C' | 'D') => {
    if (questions.length === 0) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = choice === currentQuestion.correct_answer;

    // Submit answer to database
    try {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await fetch('/api/quiz/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            question_id: currentQuestion.question_id,
            study_area: studyArea,
            user_choice: choice,
            correct_answer: currentQuestion.correct_answer
          })
        });
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setPopupMessage('Bravo! Giuseppe raises a glass to you.');
      setPopupVariant('correct');
      // Play cork pop sound
      playCorkPop();
    } else {
      setPopupMessage(currentQuestion.incorrect_answer_response || 'Not quite—try again!');
      setPopupVariant('wrong');
    }

    setShowPopup(true);

    // Track this question as used
    setUsedQuestionIds(prev => [...prev, currentQuestion.question_id]);

    // Auto-advance after popup
    setTimeout(() => {
      setShowPopup(false);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        
        // Load additional questions if we're running low (within 2 questions of the end)
        if (currentQuestionIndex >= questions.length - 2) {
          loadAdditionalQuestions();
        }
      } else {
        finishQuiz();
      }
    }, 3000);
  }, [questions, currentQuestionIndex, studyArea]);

  const finishQuiz = async () => {
    const result = calculateQuizResult(questions.length, correctAnswers);
    const baseMessage = await getQuizMessage(result);
    
    // Add score information to the message
    const scoreMessage = `${baseMessage}\n\nYou scored ${correctAnswers} out of ${questions.length} questions.`;
    
    setPopupMessage(scoreMessage);
    setPopupVariant(result);
    setShowPopup(true);
    setQuizComplete(true);
    
    // Auto-redirect to Learn page after showing the result
    setTimeout(() => {
      router.push('/learn');
    }, 5000); // Give user 5 seconds to read the message
  };

  const playCorkPop = () => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/audio/cork-pop.mp3');
      audio.play().catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Giuseppe's questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">No questions available</h2>
        <button 
          onClick={() => router.push('/learn')}
          className="btn bg-amber-600 text-white hover:bg-amber-700"
        >
          Back to Learn
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          {quizType === 'pop' ? '⚡ Pop Quiz' : '🍷 Sip & Learn'}
        </h1>
        <p className="text-muted-foreground">{studyArea}</p>
        {timeLeft !== null && (
          <div className="mt-2">
            <span className="text-2xl font-bold text-red-600">{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <WineGlassProgress total={questions.length} correct={correctAnswers} />

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <QuestionCard
            question={currentQuestion.question}
            answers={{
              A: currentQuestion.answer_a,
              B: currentQuestion.answer_b,
              C: currentQuestion.answer_c,
              D: currentQuestion.answer_d
            }}
            onAnswer={handleAnswer}
          />
        </motion.div>
      </AnimatePresence>

      {/* Popup */}
      <QuizPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => {
          setShowPopup(false);
          if (quizComplete) {
            router.push('/learn');
          }
        }}
        variant={popupVariant}
      />
    </div>
  );
}
