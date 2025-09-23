-- Fix the storage function to use the correct column name
-- The roles table uses 'id' as primary key, not 'role_id'

-- Drop existing function
DROP FUNCTION IF EXISTS is_admin_user_storage();

-- Create the corrected function using roles.id instead of roles.role_id
CREATE OR REPLACE FUNCTION is_admin_user_storage()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name text;
BEGIN
  -- Get the role name for the current user
  SELECT r.role_name INTO user_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.user_id = auth.uid();
  
  -- Return true if role is admin
  RETURN user_role_name = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false for security
    RETURN false;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

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

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT 
USING (bucket_id = 'giuseppe-avatars');
