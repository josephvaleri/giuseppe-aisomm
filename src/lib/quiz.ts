import { WineQuiz, StudyArea, QuizType } from './types';

export async function getQuizBatch(study: StudyArea, type: QuizType): Promise<WineQuiz[]> {
  const limit = type === 'pop' ? 5 : 10;
  
  // Use API route instead of direct database access
  const response = await fetch(`/api/quiz?study_area=${encodeURIComponent(study)}&type=${type}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch quiz questions');
  }
  
  return data.items || [];
}

export async function submitQuizAnswer(
  user_id: string,
  question_id: number,
  study_area: StudyArea,
  user_choice: 'A' | 'B' | 'C' | 'D',
  correct_answer: 'A' | 'B' | 'C' | 'D'
): Promise<boolean> {
  const is_correct = user_choice === correct_answer;
  
  // Use API route instead of direct database access
  const response = await fetch('/api/quiz/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id,
      question_id,
      study_area,
      user_choice,
      correct_answer
    })
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to submit answer');
  }
  
  return is_correct;
}

export async function getQuizMessage(type: 'correct' | 'complete_90' | 'complete_70' | 'fail'): Promise<string> {
  // Use API route instead of direct database access
  const response = await fetch(`/api/quiz/messages?type=${type}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch quiz message');
  }
  
  return data.message_text || 'Great job!';
}

export function calculateQuizResult(total: number, correct: number): 'complete_90' | 'complete_70' | 'fail' {
  const percentage = (correct / total) * 100;
  
  if (percentage >= 80) return 'complete_90';
  if (percentage >= 60) return 'complete_70';
  return 'fail';
}
