-- Debug script to check document storage paths
-- Run this in your Supabase SQL Editor

-- Check all documents and their storage paths
SELECT 
  id,
  filename,
  original_filename,
  storage_path,
  processed,
  category,
  upload_date
FROM documents 
ORDER BY upload_date DESC;

-- Check if there are any documents with subfolder paths
SELECT 
  id,
  filename,
  original_filename,
  storage_path,
  category
FROM documents 
WHERE storage_path LIKE '%/%'
ORDER BY upload_date DESC;

-- Count documents by storage path pattern
SELECT 
  CASE 
    WHEN storage_path LIKE '%/%' THEN 'Has subfolder'
    ELSE 'Root level'
  END as path_type,
  COUNT(*) as count
FROM documents 
GROUP BY path_type;
