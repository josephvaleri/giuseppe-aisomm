-- Add bubbly field to wines table
ALTER TABLE public.wines 
ADD COLUMN bubbly text DEFAULT 'No' CHECK (bubbly IN ('Yes', 'Slight', 'No'));

-- Add bubbly field to cellar_items table  
ALTER TABLE public.cellar_items 
ADD COLUMN bubbly text DEFAULT 'No' CHECK (bubbly IN ('Yes', 'Slight', 'No'));

-- Update all existing records to 'No' (this is the default, but being explicit)
UPDATE public.wines SET bubbly = 'No' WHERE bubbly IS NULL;
UPDATE public.cellar_items SET bubbly = 'No' WHERE bubbly IS NULL;
