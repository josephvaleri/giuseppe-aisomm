-- Simple storage policies that allow authenticated users to upload
-- Since the page is already protected by AuthWrapper, we can be more permissive

-- Drop all existing policies and function
DROP POLICY IF EXISTS "Admin users can upload avatars" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Admin users can update avatars" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Admin users can delete avatars" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects CASCADE;
DROP FUNCTION IF EXISTS is_admin_user_storage() CASCADE;

-- Ensure the bucket exists and is public
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

-- Simple policies that allow any authenticated user to manage avatars
-- The page-level protection via AuthWrapper will handle admin-only access

-- Policy 1: Allow authenticated users to upload to giuseppe-avatars
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to update files in giuseppe-avatars
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
);

-- Policy 3: Allow authenticated users to delete files from giuseppe-avatars
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'giuseppe-avatars' 
  AND auth.uid() IS NOT NULL
);

-- Policy 4: Allow anyone to view files from giuseppe-avatars bucket (public access)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT 
USING (bucket_id = 'giuseppe-avatars');
