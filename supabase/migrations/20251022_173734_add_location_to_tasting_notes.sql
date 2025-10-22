-- Add location field to existing tasting_notes table
-- This migration adds the location field that was missing from the original tasting_notes table

-- Add location column to tasting_notes table
ALTER TABLE public.tasting_notes 
ADD COLUMN IF NOT EXISTS location text;

-- Add comment to the column
COMMENT ON COLUMN public.tasting_notes.location IS 'Location where the tasting took place (e.g., Restaurant, Home, Winery)';
