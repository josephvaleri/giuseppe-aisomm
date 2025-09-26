-- Debug script to check embeddings and test document search
-- Run this in your Supabase SQL Editor

-- 1. Check if chunks have embeddings
SELECT 
    'doc_chunks' as table_name,
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    COUNT(*) - COUNT(embedding) as chunks_without_embeddings
FROM doc_chunks;

-- 2. Show sample chunks with their embedding status
SELECT 
    chunk_id,
    doc_id,
    CASE 
        WHEN embedding IS NOT NULL THEN 'Has Embedding'
        ELSE 'No Embedding'
    END as embedding_status,
    LENGTH(chunk) as chunk_length,
    LEFT(chunk, 100) as chunk_preview
FROM doc_chunks
ORDER BY chunk_id
LIMIT 10;

-- 3. Test the match_all_documents function with a simple query
WITH test_embedding AS (
  SELECT array_agg(random() * 2 - 1)::vector(3072) as query_vector
  FROM generate_series(1, 3072)
)
SELECT chunk, score, doc_id, source
FROM test_embedding, LATERAL match_all_documents(query_vector, 0.1, 5);

-- 4. Check if there are any chunks with "world" or "best" in them
SELECT 
    chunk_id,
    doc_id,
    LEFT(chunk, 200) as chunk_preview
FROM doc_chunks
WHERE chunk ILIKE '%world%' OR chunk ILIKE '%best%' OR chunk ILIKE '%wine%'
LIMIT 5;

-- 5. Check documents in "worlds_best_lists" category
SELECT 
    d.id,
    d.original_filename,
    d.category,
    COUNT(dc.chunk_id) as total_chunks,
    COUNT(dc.embedding) as chunks_with_embeddings
FROM documents d
LEFT JOIN doc_chunks dc ON d.id = dc.doc_id
WHERE d.category = 'worlds_best_lists'
GROUP BY d.id, d.original_filename, d.category;
