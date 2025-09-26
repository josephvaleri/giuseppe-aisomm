-- Debug script to see the actual CSV content in the database
SELECT 
    d.original_filename,
    d.extracted_content,
    COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN doc_chunks dc ON d.id = dc.doc_id
WHERE d.original_filename LIKE '%worlds_best_wines%'
GROUP BY d.id, d.original_filename, d.extracted_content
ORDER BY d.upload_date DESC;
