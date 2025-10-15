-- Add pg_trgm extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create function for wine similarity search
CREATE OR REPLACE FUNCTION search_wines_similarity(
  search_text TEXT,
  similarity_threshold REAL DEFAULT 0.65
)
RETURNS TABLE (
  wine_id BIGINT,
  producer VARCHAR,
  wine_name VARCHAR,
  vintage INTEGER,
  similarity REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.wine_id,
    w.producer,
    w.wine_name,
    w.vintage,
    similarity(
      COALESCE(w.producer, '') || ' ' || 
      COALESCE(w.wine_name, '') || ' ' || 
      COALESCE(w.vintage::TEXT, ''),
      search_text
    ) as similarity
  FROM wines w
  WHERE similarity(
    COALESCE(w.producer, '') || ' ' || 
    COALESCE(w.wine_name, '') || ' ' || 
    COALESCE(w.vintage::TEXT, ''),
    search_text
  ) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wines_similarity 
ON wines USING gin (
  (COALESCE(producer, '') || ' ' || COALESCE(wine_name, '') || ' ' || COALESCE(vintage::TEXT, '')) gin_trgm_ops
);
