-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('user', 'Regular user with basic access', '{"can_ask_questions": true, "can_give_feedback": true}'),
('trial', 'Trial user with limited access', '{"can_ask_questions": true, "can_give_feedback": true, "trial_limited": true}'),
('moderator', 'Moderator with content review access', '{"can_ask_questions": true, "can_give_feedback": true, "can_moderate": true}'),
('admin', 'Administrator with full access', '{"can_ask_questions": true, "can_give_feedback": true, "can_moderate": true, "can_admin": true}')
ON CONFLICT (name) DO NOTHING;

-- Add trial_end_date to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) DEFAULT 1;

-- Update existing profiles to have role_id = 1 (user)
UPDATE profiles SET role_id = 1 WHERE role_id IS NULL;

-- Add trial settings to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7;

-- Create function to check if user is on trial
CREATE OR REPLACE FUNCTION is_user_on_trial(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_id INTEGER;
  trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT p.role_id, p.trial_end_date
  INTO user_role_id, trial_end_date
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Check if user has trial role and trial hasn't expired
  IF user_role_id = 2 AND trial_end_date IS NOT NULL AND trial_end_date > NOW() THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set user trial
CREATE OR REPLACE FUNCTION set_user_trial(user_id UUID, trial_days INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    role_id = 2, -- trial role
    trial_end_date = NOW() + INTERVAL '1 day' * trial_days
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for roles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role_id = 4 -- admin role
    )
  );

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role_id = 4 -- admin role
    )
  );

-- RLS policies for roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role_id = 4 -- admin role
    )
  );

-- Set josephvaleri@gmail.com as admin
UPDATE profiles 
SET role_id = 4 -- admin role
WHERE email = 'josephvaleri@gmail.com';
