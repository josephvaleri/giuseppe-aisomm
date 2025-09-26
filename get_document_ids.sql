-- Get document IDs to reprocess
SELECT id, original_filename, processed FROM documents ORDER BY upload_date DESC;
