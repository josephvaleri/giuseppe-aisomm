-- Fix the fuzzy match function - wine_id should be bigint not int
DROP FUNCTION IF EXISTS public.match_wines_fuzzy(text, text, int, numeric, int);

CREATE OR REPLACE FUNCTION public.match_wines_fuzzy(
  p_producer text,
  p_wine_name text,
  p_vintage int default null,
  p_threshold numeric default 0.70,
  p_limit int default 25
)
RETURNS TABLE (
  wine_id bigint,
  wine_name text,
  producer text,
  vintage int,
  appellation text,
  country text,
  wine_region text,
  flavor_profile text,
  alcohol numeric,
  typical_price numeric,
  score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT
      w.wine_id,
      w.wine_name,
      w.producer,
      w.vintage,
      w.flavor_profile,
      w.alcohol,
      w.typical_price,
      a.appellation,
      cr.country_name as country,
      cr.wine_region,
      (
        0.5 * public.fuzzy_score(w.producer, p_producer) +
        0.5 * public.fuzzy_score(w.wine_name, p_wine_name)
      ) as match_score
    FROM public.wines w
    LEFT JOIN public.appellation a ON w.appellation_id = a.appellation_id
    LEFT JOIN public.countries_regions cr ON w.region_id = cr.region_id
    WHERE w.producer IS NOT NULL 
      AND w.wine_name IS NOT NULL
  )
  SELECT
    n.wine_id,
    n.wine_name,
    n.producer,
    n.vintage,
    n.appellation,
    n.country,
    n.wine_region,
    n.flavor_profile,
    n.alcohol,
    n.typical_price,
    n.match_score as score
  FROM normalized n
  WHERE n.match_score >= p_threshold
  ORDER BY 
    CASE WHEN n.vintage = p_vintage THEN 1 ELSE 0 END DESC,
    n.match_score DESC
  LIMIT p_limit;
END;
$$;

