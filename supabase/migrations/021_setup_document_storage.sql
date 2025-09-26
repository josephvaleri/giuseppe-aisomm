-- Setup document storage bucket and policies
-- Note: This migration provides the SQL for storage setup
-- You'll need to run these commands in your Supabase Dashboard > Storage section

-- Instructions for Supabase Dashboard:
-- 1. Go to Storage in your Supabase Dashboard
-- 2. Create a new bucket called "documents"
-- 3. Set it as private (not public)
-- 4. Set file size limit to 50MB
-- 5. Add allowed MIME types: application/pdf, application/msword, 
--    application/vnd.openxmlformats-officedocument.wordprocessingml.document, 
--    text/plain, text/markdown

-- Storage Policies (run these in SQL Editor after creating the bucket):
/*
-- Only admins can upload documents
CREATE POLICY "Admins can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Only admins can update documents
CREATE POLICY "Admins can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND
  EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Only admins can delete documents
CREATE POLICY "Admins can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Only admins can view documents
CREATE POLICY "Admins can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);
*/

-- For now, just ensure our document tables are ready
-- The storage bucket and policies need to be set up manually in the Supabase Dashboard
