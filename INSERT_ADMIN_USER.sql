-- ============================================================================
-- INSERT ADMIN USER - QUICK SCRIPT
-- ============================================================================
-- Use this to insert the admin user after the users table is already fixed
-- Replace the auth_user_id value with your actual Supabase Auth UID
-- ============================================================================

-- 1. INSERT ADMIN USER
INSERT INTO public.users (
  name,
  username,
  email,
  phone,
  role,
  status,
  auth_user_id
) VALUES (
  'Admin User',
  'admin',
  'admin@admin.com',
  NULL,
  'admin'::user_role,
  'active'::user_status,
  '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin'::user_role,
  status = 'active'::user_status,
  auth_user_id = '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid,
  updated_at = now();

-- 2. GRANT ALL PERMISSIONS TO ADMIN USER
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  u.id,
  pc.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com'
  AND u.role = 'admin'
ON CONFLICT (user_id, permission_key) DO UPDATE SET
  granted = true,
  created_at = now();

-- 3. VERIFY THE ADMIN USER WAS CREATED
SELECT 
  u.id,
  u.name,
  u.username,
  u.email,
  u.role,
  u.status,
  u.auth_user_id,
  COUNT(up.id) as total_permissions
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.email = 'admin@admin.com'
GROUP BY u.id, u.name, u.username, u.email, u.role, u.status, u.auth_user_id;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- The SELECT query should return 1 row with:
-- - id: generated UUID
-- - name: Admin User
-- - username: admin
-- - email: admin@admin.com
-- - role: admin
-- - status: active
-- - auth_user_id: 47bc3611-fd76-4b14-a619-7c510e612ecb
-- - total_permissions: [number of permissions granted]
-- ============================================================================
