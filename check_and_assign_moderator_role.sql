-- Check current user roles
SELECT ur.user_id, p.email, ur.role
FROM user_roles ur
LEFT JOIN profiles p ON p.user_id = ur.user_id;

-- If no roles exist, run this to assign moderator role to your user:
-- Replace 'your-email@example.com' with your actual email

-- INSERT INTO user_roles (user_id, role)
-- SELECT user_id, 'moderator'
-- FROM profiles
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'moderator';

-- Alternative: Assign admin role (has full access)
-- INSERT INTO user_roles (user_id, role)
-- SELECT user_id, 'admin'
-- FROM profiles
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
