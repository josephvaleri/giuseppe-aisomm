-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_wine_region_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_all_documents(vector, double precision, integer);

-- Create match_documents function for vector search
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

-- Create match_wine_region_documents function for wine region documents
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
    wrd.content as chunk,
    1 - (wrd.embedding <=> query_embedding) as score,
    wrd.id as doc_id,
    'wine_region_documents' as source
  FROM wine_region_documents wrd
  WHERE 1 - (wrd.embedding <=> query_embedding) > match_threshold
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
    -- Search regular documents
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
      wrd.content as chunk,
      1 - (wrd.embedding <=> query_embedding) as score,
      wrd.id as doc_id,
      'wine_region_documents' as source
    FROM wine_region_documents wrd
    WHERE 1 - (wrd.embedding <=> query_embedding) > match_threshold
  )
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
