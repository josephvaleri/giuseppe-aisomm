-- Fix document search function to handle null embeddings properly
-- Run this in your Supabase SQL Editor

-- Drop and recreate the match_all_documents function with proper null checks
DROP FUNCTION IF EXISTS match_all_documents(vector, double precision, integer);

CREATE OR REPLACE FUNCTION match_all_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 6
)
RETURNS TABLE (
  chunk text,
  score float,
  doc_id uuid,
  source text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  (
    -- Search regular documents via doc_chunks (with null check)
    SELECT 
      dc.chunk,
      1 - (dc.embedding <=> query_embedding) as score,
      dc.doc_id,
      'documents' as source
    FROM doc_chunks dc
    WHERE dc.embedding IS NOT NULL 
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Search wine region documents (with null check)
    SELECT 
      COALESCE(wrd.description, wrd.region_name || ' ' || wrd.country, 'Wine region document') as chunk,
      1 - (wrd.embedding <=> query_embedding) as score,
      wrd.id as doc_id,
      'wine_region_documents' as source
    FROM wine_region_documents wrd
    WHERE wrd.embedding IS NOT NULL 
      AND 1 - (wrd.embedding <=> query_embedding) > match_threshold
  )
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
