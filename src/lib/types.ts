export type StudyArea = 'Regions & Appellations' | 'Grapes' | 'Styles' | 'Pairings' | 'Classifications';

export type WineQuiz = {
  question_id: number;
  study_area: StudyArea;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: 'A'|'B'|'C'|'D';
  incorrect_answer_response?: string | null;
  upvotes: number;
  downvotes: number;
};

export type QuizMessage = {
  message_id: number;
  answer_type: 'correct' | 'complete_90' | 'complete_70' | 'fail';
  message_text: string;
};

export type UserQuizProgress = {
  id: number;
  user_id: string;
  question_id: number;
  study_area: StudyArea;
  is_correct: boolean;
  created_at: string;
};

export type UserStudyMastery = {
  user_id: string;
  study_area: StudyArea;
  correct_unique_count: number;
  badge_tier: number;
  updated_at: string;
};

export type QuizType = 'pop' | 'sip';

export type QuizResult = {
  total: number;
  correct: number;
  score: number;
  outcome: 'complete_90' | 'complete_70' | 'fail';
};
