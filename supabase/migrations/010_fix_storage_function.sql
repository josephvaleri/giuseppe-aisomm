-- Fix the storage function to properly reference the roles table
-- The issue is that we're trying to join profiles.role_id to roles.role_id
-- but we should be joining profiles.role_id to roles.role_id

-- Drop the existing function
DROP FUNCTION IF EXISTS is_admin_user_storage();

-- Create the corrected function
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

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete avatars" ON storage.objects;

-- Recreate policies with the corrected function
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
