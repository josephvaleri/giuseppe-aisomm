-- The issue is that our policies reference the profiles table to check admin status,
-- but they're also protecting the profiles table, creating infinite recursion.

-- Solution: Use a SECURITY DEFINER function that bypasses RLS for the role check

-- First, create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND (role = 'admin' OR role_id = 4)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is staff (admin or moderator)
CREATE OR REPLACE FUNCTION is_staff_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND (role IN ('admin', 'moderator') OR role_id IN (3, 4))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "read own or staff" ON profiles;
DROP POLICY IF EXISTS "update own or admin" ON profiles;

-- Create secure, non-recursive policies using the functions
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admins_all_profiles" ON profiles
  FOR ALL USING (is_admin_user(auth.uid()));

-- Fix roles table policies
DROP POLICY IF EXISTS "Everyone can view roles" ON roles;
DROP POLICY IF EXISTS "Only admins can modify roles" ON roles;

CREATE POLICY "public_roles_read" ON roles
  FOR SELECT USING (true);

CREATE POLICY "admins_roles_modify" ON roles
  FOR ALL USING (is_admin_user(auth.uid()));

-- Create admin profiles for both users
INSERT INTO public.profiles (user_id, email, full_name, role, role_id)
SELECT 
  id as user_id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  'admin' as role,
  4 as role_id
FROM auth.users 
WHERE email IN ('jvaleri@yahoo.com', 'josephvaleri@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'admin',
  role_id = 4;
