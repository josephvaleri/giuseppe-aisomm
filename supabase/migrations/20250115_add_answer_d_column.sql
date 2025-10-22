-- Add answer_d column to wine_quiz table
ALTER TABLE public.wine_quiz 
ADD COLUMN IF NOT EXISTS answer_d text;

-- Update the check constraint to include 'D' as a valid answer
ALTER TABLE public.wine_quiz 
DROP CONSTRAINT IF EXISTS wine_quiz_correct_answer_check;

ALTER TABLE public.wine_quiz 
ADD CONSTRAINT wine_quiz_correct_answer_check 
CHECK (correct_answer IN ('A','B','C','D'));
