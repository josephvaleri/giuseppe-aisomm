-- Fix storage policies for documents bucket
-- Run this in your Supabase SQL Editor

-- First, let's check what policies currently exist
SELECT * FROM storage.policies WHERE bucket_id = 'documents';

-- Drop all existing policies for the documents bucket
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;

-- Create new comprehensive policies for the documents bucket
-- Upload policy: Admins can upload, users can upload their own files
CREATE POLICY "Admins can upload documents, users can upload own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    ) OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Update policy: Admins can update, users can update their own files
CREATE POLICY "Admins can update documents, users can update own" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    ) OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Delete policy: Admins can delete, users can delete their own files
CREATE POLICY "Admins can delete documents, users can delete own" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    ) OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- View policy: Admins can view all, users can view their own files
CREATE POLICY "Admins can view all documents, users can view own" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    ) OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Alternative simpler policy if the above doesn't work
-- This allows all authenticated users to manage documents
/*
DROP POLICY IF EXISTS "Admins can upload documents, users can upload own" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents, users can update own" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents, users can delete own" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents, users can view own" ON storage.objects;

CREATE POLICY "Authenticated users can manage documents" ON storage.objects
FOR ALL USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
*/

-- Verify the policies were created
SELECT * FROM storage.policies WHERE bucket_id = 'documents';
