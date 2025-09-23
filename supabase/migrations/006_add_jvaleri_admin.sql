-- Create admin profile for jvaleri@yahoo.com
INSERT INTO public.profiles (user_id, email, full_name, role, role_id, subscription_status)
SELECT 
  id as user_id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  'admin' as role,
  4 as role_id,
  'none'::subscription_status
FROM auth.users 
WHERE email = 'jvaleri@yahoo.com'
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'admin',
  role_id = 4,
  subscription_status = 'none'::subscription_status;

-- If the user doesn't exist in auth.users yet, we'll need to create them manually
-- This is a fallback in case the user needs to be created first
DO $$
BEGIN
    -- Check if user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jvaleri@yahoo.com') THEN
        RAISE NOTICE 'User jvaleri@yahoo.com does not exist in auth.users. They need to sign up first or be created manually.';
    ELSE
        RAISE NOTICE 'Admin profile created/updated for jvaleri@yahoo.com';
    END IF;
END $$;
