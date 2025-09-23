-- Fix storage policies for giuseppe-avatars bucket
-- Allow admin users to upload, update, and delete avatar files

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'giuseppe-avatars',
  'giuseppe-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create new policies for the giuseppe-avatars bucket
-- Policy 1: Allow admin users to upload files to giuseppe-avatars bucket
CREATE POLICY "Admin users can upload avatars" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.role_id
    WHERE p.user_id = auth.uid() 
    AND r.role_name = 'admin'
  )
);

-- Policy 2: Allow admin users to update files in giuseppe-avatars bucket
CREATE POLICY "Admin users can update avatars" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.role_id
    WHERE p.user_id = auth.uid() 
    AND r.role_name = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.role_id
    WHERE p.user_id = auth.uid() 
    AND r.role_name = 'admin'
  )
);

-- Policy 3: Allow admin users to delete files from giuseppe-avatars bucket
CREATE POLICY "Admin users can delete avatars" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.role_id
    WHERE p.user_id = auth.uid() 
    AND r.role_name = 'admin'
  )
);

-- Policy 4: Allow anyone to view files from giuseppe-avatars bucket (public access)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT 
USING (bucket_id = 'giuseppe-avatars');

-- Alternative approach using SECURITY DEFINER functions to avoid RLS recursion
-- Create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin_user_storage()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.role_id
    WHERE p.user_id = auth.uid() 
    AND r.role_name = 'admin'
  );
END;
$$;

-- Drop and recreate policies using the SECURITY DEFINER function
DROP POLICY IF EXISTS "Admin users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete avatars" ON storage.objects;

-- Recreate policies using the SECURITY DEFINER function
CREATE POLICY "Admin users can upload avatars" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND is_admin_user_storage()
);

CREATE POLICY "Admin users can update avatars" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND is_admin_user_storage()
)
WITH CHECK (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND is_admin_user_storage()
);

CREATE POLICY "Admin users can delete avatars" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
  AND is_admin_user_storage()
);
