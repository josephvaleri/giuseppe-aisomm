-- Fix fuzzy_match_wines function to return proper numeric types
CREATE OR REPLACE FUNCTION fuzzy_match_wines(
  input_wine_name text,
  input_producer text DEFAULT NULL,
  input_vintage integer DEFAULT NULL,
  match_threshold numeric DEFAULT 0.5
)
RETURNS TABLE (
  wine_id bigint,
  wine_name varchar,
  producer varchar,
  vintage integer,
  match_score numeric,
  total_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.wine_id,
    w.wine_name,
    w.producer,
    w.vintage,
    GREATEST(
      similarity(w.wine_name, input_wine_name),
      CASE WHEN input_producer IS NOT NULL AND w.producer IS NOT NULL 
           THEN similarity(w.producer, input_producer) 
           ELSE 0 END
    )::numeric as match_score,
    (
      similarity(w.wine_name, input_wine_name) * 0.5 +
      CASE WHEN input_producer IS NOT NULL AND w.producer IS NOT NULL 
           THEN similarity(w.producer, input_producer) * 0.3 
           ELSE 0 END +
      CASE WHEN input_vintage IS NOT NULL AND w.vintage IS NOT NULL 
           THEN CASE WHEN w.vintage = input_vintage THEN 0.2 ELSE 0 END 
           ELSE 0.2 END
    )::numeric as total_score
  FROM wines w
  WHERE (
    similarity(w.wine_name, input_wine_name) >= match_threshold OR
    (input_producer IS NOT NULL AND w.producer IS NOT NULL AND 
     similarity(w.producer, input_producer) >= match_threshold)
  )
  ORDER BY total_score DESC
  LIMIT 10;
END;
$$;




