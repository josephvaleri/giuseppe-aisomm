-- First, let's create a profile for the existing user if it doesn't exist
INSERT INTO public.profiles (user_id, email, full_name, role, role_id)
SELECT 
  id as user_id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  'admin' as role,
  4 as role_id
FROM auth.users 
WHERE email = 'josephvaleri@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  role_id = 4;

-- Fix the roles table relationship by ensuring the foreign key constraint is correct
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_id_fkey 
  FOREIGN KEY (role_id) REFERENCES roles(id);

-- Create a function to get user role safely
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_id INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(r.name, p.role, 'user') as role_name,
    COALESCE(p.role_id, 1) as role_id
  FROM profiles p
  LEFT JOIN roles r ON p.role_id = r.id
  WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to be more permissive for debugging
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND (p.role = 'admin' OR p.role_id = 4)
    )
  );

-- Make sure the roles table is accessible
DROP POLICY IF EXISTS "Everyone can view roles" ON roles;
CREATE POLICY "Everyone can view roles" ON roles
  FOR SELECT USING (true);
