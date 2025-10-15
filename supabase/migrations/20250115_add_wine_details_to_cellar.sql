-- Add wine details fields to cellar_items table
-- These fields will store wine-specific information that users can override

-- Add drink window fields
ALTER TABLE public.cellar_items 
ADD COLUMN IF NOT EXISTS drink_starting DATE NULL,
ADD COLUMN IF NOT EXISTS drink_by DATE NULL;

-- Add pricing field (from wines table, can be overridden by user)
ALTER TABLE public.cellar_items 
ADD COLUMN IF NOT EXISTS typical_price NUMERIC(10,2) NULL;

-- Add ratings field (from wines table, can be overridden by user)
ALTER TABLE public.cellar_items 
ADD COLUMN IF NOT EXISTS ratings TEXT NULL;

-- Add wine type/color field
ALTER TABLE public.cellar_items 
ADD COLUMN IF NOT EXISTS color TEXT NULL;

-- Add alcohol percentage field
ALTER TABLE public.cellar_items 
ADD COLUMN IF NOT EXISTS alcohol NUMERIC(5,2) NULL;

-- Add bottle size field
ALTER TABLE public.cellar_items 
ADD COLUMN IF NOT EXISTS bottle_size TEXT NULL;

-- Update existing my_rating values from 1-10 scale to 1-5 scale
-- Convert 1-10 ratings to 1-5 wine glass ratings (divide by 2, round up)
UPDATE public.cellar_items 
SET my_rating = CEIL(my_rating::numeric / 2)
WHERE my_rating IS NOT NULL AND my_rating > 5;

-- Update the my_rating constraint to allow 1-5 for wine glass rating system
ALTER TABLE public.cellar_items 
DROP CONSTRAINT IF EXISTS cellar_items_my_rating_check;

ALTER TABLE public.cellar_items 
ADD CONSTRAINT cellar_items_my_rating_check CHECK (
  (my_rating >= 1) AND (my_rating <= 5)
);

-- Add comments to clarify field purposes
COMMENT ON COLUMN public.cellar_items.drink_starting IS 'Drink window start date (from wines table or user override)';
COMMENT ON COLUMN public.cellar_items.drink_by IS 'Drink window end date (from wines table or user override)';
COMMENT ON COLUMN public.cellar_items.typical_price IS 'Typical retail price (from wines table or user override)';
COMMENT ON COLUMN public.cellar_items.ratings IS 'Professional ratings (from wines table or user override)';
COMMENT ON COLUMN public.cellar_items.value IS 'Personal value/cost paid for this bottle in cellar';
COMMENT ON COLUMN public.cellar_items.my_rating IS 'Personal rating 1-5 wine glasses';
COMMENT ON COLUMN public.cellar_items.my_notes IS 'Personal notes about this bottle';

-- Drop and recreate the get_user_cellar function to include new fields
DROP FUNCTION IF EXISTS get_user_cellar();

CREATE FUNCTION get_user_cellar()
RETURNS TABLE (
  bottle_id bigint,
  wine_id bigint,
  wine_name varchar,
  producer varchar,
  vintage integer,
  appellation varchar,
  region_name varchar,
  country_name varchar,
  quantity integer,
  where_stored text,
  value numeric,
  currency text,
  status text,
  my_notes text,
  my_rating integer,
  created_at timestamptz,
  updated_at timestamptz,
  drink_starting date,
  drink_by date,
  typical_price numeric,
  ratings text,
  color text,
  alcohol numeric,
  bottle_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.bottle_id,
    ci.wine_id,
    w.wine_name,
    w.producer,
    w.vintage,
    a.appellation,
    cr.wine_region as region_name,
    cr.country_name,
    ci.quantity,
    ci.where_stored,
    ci.value,
    ci.currency,
    ci.status,
    ci.my_notes,
    ci.my_rating,
    ci.created_at,
    ci.updated_at,
    -- Use cellar_items fields if they exist, otherwise fall back to wines table
    COALESCE(ci.drink_starting, w.drink_starting::date) as drink_starting,
    COALESCE(ci.drink_by, w.drink_by::date) as drink_by,
    COALESCE(ci.typical_price, w.typical_price::numeric) as typical_price,
    COALESCE(ci.ratings, w.ratings::text) as ratings,
    COALESCE(ci.color, w.color::text) as color,
    COALESCE(ci.alcohol, w.alcohol::numeric) as alcohol,
    COALESCE(ci.bottle_size, w.bottle_size::text) as bottle_size
  FROM cellar_items ci
  JOIN wines w ON ci.wine_id = w.wine_id
  LEFT JOIN appellation a ON w.appellation_id = a.appellation_id
  LEFT JOIN countries_regions cr ON w.region_id = cr.region_id
  WHERE ci.user_id = auth.uid()
  ORDER BY ci.created_at DESC;
END;
$$;
