-- Fix country_id data type in tasting_notes table to match countries_regions table
-- The countries_regions table uses string country codes (e.g., 'USA', 'ITA', 'FRA')
-- but tasting_notes was defined with integer country_id

-- First, let's check what the countries_regions table structure looks like
-- and then update tasting_notes to match

-- Change country_id from integer to text to match countries_regions.country_id
ALTER TABLE public.tasting_notes 
ALTER COLUMN country_id TYPE text;

-- Add comment to clarify the data type
COMMENT ON COLUMN public.tasting_notes.country_id IS 'Country code (string) matching countries_regions.country_id (e.g., USA, ITA, FRA)';
