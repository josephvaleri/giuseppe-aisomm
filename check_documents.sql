SELECT id, original_filename, storage_path, file_size FROM documents LIMIT 5;
SELECT * FROM storage.objects WHERE bucket_id = 'documents' LIMIT 10;
