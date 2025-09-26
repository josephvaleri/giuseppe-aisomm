-- Test document search functionality
-- Run this in your Supabase SQL Editor after running the fix

-- 1. First, let's create a simple test embedding for "world best wines"
WITH test_embedding AS (
  -- Create a simple test vector (all zeros with a few 1s)
  SELECT ARRAY[1.0, 0.5, 0.0, 0.0, 0.3, 0.0] || ARRAY_FILL(0.0, ARRAY[3066])::vector(3072) as query_vector
)
SELECT 
  'Test 1: Basic function test' as test_name,
  chunk,
  score,
  doc_id,
  source
FROM test_embedding, LATERAL match_all_documents(query_vector, 0.1, 3);

-- 2. Test with even lower threshold
WITH test_embedding AS (
  SELECT ARRAY[1.0, 0.5, 0.0, 0.0, 0.3, 0.0] || ARRAY_FILL(0.0, ARRAY[3066])::vector(3072) as query_vector
)
SELECT 
  'Test 2: Very low threshold' as test_name,
  chunk,
  score,
  doc_id,
  source
FROM test_embedding, LATERAL match_all_documents(query_vector, 0.0, 3);

-- 3. Check if we have any chunks at all
SELECT 
  'Test 3: Check chunks exist' as test_name,
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings
FROM doc_chunks;

-- 4. Check specific chunks from worlds_best_lists category
SELECT 
  'Test 4: Worlds best lists chunks' as test_name,
  dc.chunk_id,
  d.original_filename,
  LEFT(dc.chunk, 100) as chunk_preview,
  CASE WHEN dc.embedding IS NOT NULL THEN 'Has Embedding' ELSE 'No Embedding' END as embedding_status
FROM doc_chunks dc
JOIN documents d ON dc.doc_id = d.id
WHERE d.category = 'worlds_best_lists'
LIMIT 5;
