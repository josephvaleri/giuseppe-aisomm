-- Test script to see the actual CSV content in chunks
-- Run this in your Supabase SQL Editor

-- Find chunks that contain wine list CSV content
SELECT 
    chunk_id,
    doc_id,
    LEFT(chunk, 1000) as chunk_preview
FROM doc_chunks 
WHERE chunk ILIKE '%worlds_best_wines_lists%' 
   OR chunk ILIKE '%List Name%'
   OR chunk ILIKE '%Click to View%'
   OR chunk ILIKE '%Wine Spectator%'
   OR chunk ILIKE '%James Suckling%'
ORDER BY chunk_id
LIMIT 5;

-- Check if there are any URLs in the chunks
SELECT 
    chunk_id,
    doc_id,
    CASE 
        WHEN chunk ~ 'https?://' THEN 'Contains URL'
        ELSE 'No URL found'
    END as has_url,
    chunk
FROM doc_chunks 
WHERE chunk ILIKE '%worlds_best_wines_lists%' 
   OR chunk ILIKE '%List Name%'
LIMIT 3;
