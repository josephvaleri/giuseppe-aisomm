-- Create the documents storage bucket
-- Run this in your Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents', 
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/csv',
    'text/csv'
  ]
);

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'documents';
