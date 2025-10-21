-- Fix get_user_cellar function to handle VARCHAR drink window fields
-- The function was trying to cast DATE to VARCHAR which caused a type mismatch error

-- Drop and recreate the get_user_cellar function with proper type handling
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
  drink_starting varchar,
  drink_by varchar,
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
    -- Use cellar_items fields if they exist, otherwise fall back to wines table (cast to text)
    COALESCE(ci.drink_starting, w.drink_starting::text) as drink_starting,
    COALESCE(ci.drink_by, w.drink_by::text) as drink_by,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_cellar TO authenticated;
