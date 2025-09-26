-- Test script for match_all_documents function
-- Run this in your Supabase SQL editor

-- First, let's check if the function exists and what it expects
SELECT 'Function exists check' as info, 
       routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_name = 'match_all_documents' 
AND routine_schema = 'public';

-- Create a test embedding vector (3072 dimensions of random values between -1 and 1)
-- This is a simple test vector - in real usage, you'd use actual embeddings from your AI model
WITH test_embedding AS (
  SELECT array_agg(random() * 2 - 1)::vector(3072) as query_vector
  FROM generate_series(1, 3072)
)
SELECT chunk, score, doc_id, source
FROM test_embedding, LATERAL match_all_documents(query_vector, 0.1, 5);

-- Alternative test: Check if there are any embeddings in your tables first
SELECT 'Embedding availability check' as info,
       'doc_chunks' as table_name,
       count(*) as total_rows,
       count(embedding) as rows_with_embeddings
FROM doc_chunks
UNION ALL
SELECT 'Embedding availability check' as info,
       'wine_region_documents' as table_name,
       count(*) as total_rows,
       count(embedding) as rows_with_embeddings
FROM wine_region_documents;

-- Test with a smaller threshold and fewer results if no embeddings exist
WITH test_embedding AS (
  SELECT array_agg(random() * 2 - 1)::vector(3072) as query_vector
  FROM generate_series(1, 3072)
)
SELECT chunk, score, doc_id, source
FROM test_embedding, LATERAL match_all_documents(query_vector, 0.0, 3);
