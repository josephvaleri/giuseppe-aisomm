-- Fix document search functions to work with actual table schemas

-- Drop existing functions
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_wine_region_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_all_documents(vector, double precision, integer);

-- Create match_documents function for vector search using doc_chunks
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
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
  SELECT 
    dc.chunk,
    1 - (dc.embedding <=> query_embedding) as score,
    dc.doc_id,
    'documents' as source
  FROM doc_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add embedding column to wine_region_documents if it doesn't exist
ALTER TABLE public.wine_region_documents 
ADD COLUMN IF NOT EXISTS embedding vector(3072);

-- Note: Index creation skipped for 3072-dimensional vectors
-- The functions will work without indexes, though they may be slower for large datasets
-- You can add indexes later if your pgvector version supports high-dimensional HNSW

-- Create match_wine_region_documents function
-- Note: This function needs content to be extracted from storage_path or use description
CREATE OR REPLACE FUNCTION match_wine_region_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
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
  SELECT 
    COALESCE(wrd.description, wrd.region_name || ' ' || wrd.country, 'Wine region document') as chunk,
    1 - (wrd.embedding <=> query_embedding) as score,
    wrd.id as doc_id,
    'wine_region_documents' as source
  FROM wine_region_documents wrd
  WHERE wrd.embedding IS NOT NULL 
    AND 1 - (wrd.embedding <=> query_embedding) > match_threshold
  ORDER BY wrd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create combined document search function
CREATE OR REPLACE FUNCTION match_all_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
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
    -- Search regular documents via doc_chunks
    SELECT 
      dc.chunk,
      1 - (dc.embedding <=> query_embedding) as score,
      dc.doc_id,
      'documents' as source
    FROM doc_chunks dc
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Search wine region documents
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
