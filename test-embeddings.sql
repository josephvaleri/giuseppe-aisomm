-- Test script to check if embeddings are being generated
-- Run this in your Supabase SQL Editor

-- Check if chunks have embeddings
SELECT 
    'doc_chunks' as table_name,
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    COUNT(*) - COUNT(embedding) as chunks_without_embeddings
FROM doc_chunks;

-- Show sample chunks with their embedding status
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

-- Check documents and their processing status
SELECT 
    d.id,
    d.original_filename,
    d.category,
    d.processed,
    COUNT(dc.chunk_id) as total_chunks,
    COUNT(dc.embedding) as chunks_with_embeddings
FROM documents d
LEFT JOIN doc_chunks dc ON d.id = dc.doc_id
GROUP BY d.id, d.original_filename, d.category, d.processed
ORDER BY d.upload_date DESC;
