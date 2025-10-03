-- Debug script to check document tables
-- Run this in your Supabase SQL editor

-- Check if documents table exists and has data
SELECT 'documents table' as table_name, count(*) as row_count 
FROM documents;

-- Check if wine_region_documents table exists and has data  
SELECT 'wine_region_documents table' as table_name, count(*) as row_count
FROM wine_region_documents;

-- Check if doc_chunks table exists and has data
SELECT 'doc_chunks table' as table_name, count(*) as row_count
FROM doc_chunks;

-- Check sample data from documents table
SELECT 'documents sample' as info, id, filename, original_filename, file_size, 
       mime_type, extracted_content, upload_date, processed, category
FROM documents 
LIMIT 3;

-- Check sample data from wine_region_documents table
SELECT 'wine_region_documents sample' as info, id, filename, original_filename, 
       storage_path, file_size, mime_type, region_name, country, 
       document_type, description, created_at, updated_at
FROM wine_region_documents 
LIMIT 3;

-- Check if embeddings exist in doc_chunks
SELECT 'doc_chunks with embeddings' as info, count(*) as count
FROM doc_chunks 
WHERE embedding IS NOT NULL;

-- Check if embeddings exist in wine_region_documents
SELECT 'wine_region_documents with embeddings' as info, count(*) as count
FROM wine_region_documents 
WHERE embedding IS NOT NULL;

-- Check if embedding column exists in wine_region_documents
SELECT 'wine_region_documents embedding column check' as info, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'wine_region_documents' 
         AND column_name = 'embedding' 
         AND table_schema = 'public'
       ) THEN 'embedding column exists' ELSE 'embedding column missing' END as status;

-- Check the actual column structure of documents table
SELECT 'documents columns' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the actual column structure of wine_region_documents table
SELECT 'wine_region_documents columns' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wine_region_documents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the match_all_documents function
SELECT 'Testing match_all_documents function' as info;
-- This will test if the function works (you'll need to provide a test embedding)






