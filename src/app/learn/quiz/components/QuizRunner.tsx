'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionCard from './QuestionCard';
import QuizPopup from './QuizPopup';
import WineGlassProgress from './WineGlassProgress';
import CorrectCheckmark from './CorrectCheckmark';
import IncorrectFlash from './IncorrectFlash';
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
  const [showCorrectCheckmark, setShowCorrectCheckmark] = useState(false);
  const [showIncorrectX, setShowIncorrectX] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quizType === 'pop' ? 60 : null);
  const [quizComplete, setQuizComplete] = useState(false);
  const hasShuffled = useRef(false);
  const lastQuizKey = useRef<string>('');

  // Load questions
  useEffect(() => {
    const currentQuizKey = `${studyArea}-${quizType}`;
    console.log('useEffect triggered - studyArea:', studyArea, 'quizType:', quizType, 'currentQuizKey:', currentQuizKey, 'lastQuizKey:', lastQuizKey.current);
    
    // Only load questions if this is a new quiz combination
    if (lastQuizKey.current !== currentQuizKey) {
      console.log('Loading questions for new quiz combination');
      lastQuizKey.current = currentQuizKey;
      hasShuffled.current = false; // Reset shuffle flag for new quiz
      loadQuestions();
    } else {
      console.log('Skipping question load - same quiz combination');
    }
  }, [studyArea, quizType]);

  // Questions are already shuffled during selection, no need for additional shuffling

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
      const url = `/api/quiz?study_area=${encodeURIComponent(studyArea)}&type=${quizType}`;
      console.log('Loading questions from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Quiz response:', data);
      
      const questions = data.items || [];
      console.log('Questions loaded:', questions.length);
      console.log('Question IDs from API:', questions.map(q => q.question_id));
      
      // Randomly select the number of questions we need for this quiz
      const limit = quizType === 'pop' ? 5 : 10;
      
      // Questions are already shuffled at the API level, just select the first N
      const selectedQuestions = questions.slice(0, limit);
      
      // Add debugging to see what questions are being selected
      console.log('Questions from API (first 20):', questions.slice(0, 20).map(q => q.question_id));
      console.log('Selected question IDs for this quiz:', selectedQuestions.map(q => q.question_id));
      
      console.log('Randomly selected questions:', selectedQuestions.length, 'from pool of:', questions.length);
      console.log('Selected question IDs:', selectedQuestions.map(q => q.question_id));
      
      if (selectedQuestions.length === 0) {
        console.error('No questions selected! This should not happen.');
      }
      
      setQuestions(selectedQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed loadAdditionalQuestions - pop quizzes should be exactly 5 questions, regular quizzes exactly 10

  const handleAnswer = useCallback(async (choice: 'A' | 'B' | 'C' | 'D') => {
    if (questions.length === 0) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = choice === currentQuestion.correct_answer;

    // Show response immediately
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      // Show correct checkmark
      setShowCorrectCheckmark(true);
      // Play cork pop sound
      playCorkPop();
    } else {
      // Show incorrect X
      setShowIncorrectX(true);
    }


    // Submit answer to database asynchronously (don't wait for it)
    const submitAnswer = async () => {
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
    };

    // Submit in background without waiting
    submitAnswer();

    // Auto-advance after flash (1 second for both correct and incorrect)
    setTimeout(() => {
      setShowCorrectCheckmark(false);
      setShowIncorrectX(false);
      
      // For pop quiz, stop at exactly 5 questions. For regular quiz, stop at 10 questions
      const maxQuestions = quizType === 'pop' ? 5 : 10;
      
      if (currentQuestionIndex < maxQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Don't increment index for final question - just finish the quiz
        // Pass the current answer result to finishQuiz to ensure accurate scoring
        finishQuiz(isCorrect);
      }
    }, 1000); // 1 second for both correct and incorrect
  }, [questions, currentQuestionIndex, studyArea]);

  const finishQuiz = async (finalAnswerCorrect?: boolean) => {
    const totalQuestions = quizType === 'pop' ? 5 : 10;
    
    // Calculate the final score including the last answer
    const finalCorrectAnswers = correctAnswers + (finalAnswerCorrect ? 1 : 0);
    
    const result = calculateQuizResult(totalQuestions, finalCorrectAnswers);
    const baseMessage = await getQuizMessage(result);
    
    // Add score information to the message
    const scoreMessage = `${baseMessage}\n\nYou scored ${finalCorrectAnswers} out of ${totalQuestions} questions.`;
    
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

  // Add debugging and safety checks
  console.log('Questions length:', questions.length, 'Current index:', currentQuestionIndex);
  
  if (currentQuestionIndex >= questions.length) {
    console.error('Current question index out of bounds:', currentQuestionIndex, 'Questions length:', questions.length);
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Quiz Error</h2>
        <p className="text-muted-foreground mb-4">Question index out of bounds</p>
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
      <WineGlassProgress 
        total={quizType === 'pop' ? 5 : 10} 
        correct={correctAnswers} 
        current={currentQuestionIndex} 
      />

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

      {/* Correct Checkmark */}
      <CorrectCheckmark show={showCorrectCheckmark} />

      {/* Incorrect X */}
      <IncorrectFlash show={showIncorrectX} />

      {/* Popup (only for quiz completion) */}
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
