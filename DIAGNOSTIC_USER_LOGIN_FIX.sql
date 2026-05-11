-- ============================================================================
-- DIAGNOSTIC & FIX: User Login 500 Error - "Database error querying schema"
-- ============================================================================
-- This SQL file helps diagnose and fix the login 500 error when users can't login
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSE - Check if user exists in both tables
-- ============================================================================

-- First, check what users exist in auth.users
SELECT 
  id,
  email,
  created_at,
  CASE WHEN raw_user_meta_data->>'name' IS NOT NULL 
    THEN raw_user_meta_data->>'name' 
    ELSE 'NO NAME' 
  END as name
FROM auth.users
WHERE email = 'admin@admin.com'
ORDER BY created_at DESC;

-- Then, check what users exist in public.users
SELECT 
  id,
  name,
  username,
  email,
  role,
  status,
  auth_user_id,
  created_at
FROM public.users
WHERE email = 'admin@admin.com'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 2: CHECK LINKING - Verify auth_user_id is properly linked
-- ============================================================================

-- This query shows if a public.user is properly linked to an auth.user
SELECT 
  pu.id as public_user_id,
  pu.email,
  pu.role,
  pu.status,
  pu.auth_user_id,
  au.id as auth_user_id,
  au.email as auth_email,
  CASE 
    WHEN pu.auth_user_id = au.id THEN '✅ LINKED'
    WHEN pu.auth_user_id IS NULL THEN '❌ NO auth_user_id'
    ELSE '❌ MISMATCH'
  END as link_status
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.email = 'admin@admin.com';

-- ============================================================================
-- STEP 3: FIX OPTION A - Delete and recreate via application
-- ============================================================================

-- If user is completely broken, delete both records:
-- WARNING: This deletes the user completely!

-- DELETE FROM public.user_permissions WHERE user_id IN (
--   SELECT id FROM public.users WHERE email = 'admin@admin.com'
-- );
-- 
-- DELETE FROM public.users WHERE email = 'admin@admin.com';
-- 
-- DELETE FROM auth.users WHERE email = 'admin@admin.com';
-- 
-- Then recreate through the application's Utilisateurs page.

-- ============================================================================
-- STEP 4: FIX OPTION B - Link existing auth user to public user
-- ============================================================================

-- If you have an auth.user but missing public.user:
-- First, get the auth UUID:

SELECT id FROM auth.users WHERE email = 'admin@admin.com';

-- Then insert into public.users with that UUID as auth_user_id:

-- INSERT INTO public.users (
--   id,
--   name,
--   username,
--   email,
--   role,
--   status,
--   auth_user_id,
--   created_at,
--   updated_at
-- ) VALUES (
--   gen_random_uuid(),
--   'Administrator',
--   'admin',
--   'admin@admin.com',
--   'admin'::user_role,
--   'active'::user_status,
--   (SELECT id FROM auth.users WHERE email = 'admin@admin.com'),
--   now(),
--   now()
-- );

-- ============================================================================
-- STEP 5: VERIFY RLS POLICIES are working correctly
-- ============================================================================

-- Check if RLS is enabled on public.users
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- Result should show: rowsecurity = true

-- ============================================================================
-- STEP 6: GRANT ADMIN PERMISSIONS
-- ============================================================================

-- After creating the user, ensure they have admin permissions:

INSERT INTO public.user_permissions (
  user_id,
  permission_key,
  granted
)
SELECT 
  u.id,
  k.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog k
WHERE u.email = 'admin@admin.com'
ON CONFLICT (user_id, permission_key) 
DO UPDATE SET granted = true;

-- ============================================================================
-- STEP 7: VERIFY EVERYTHING IS WORKING
-- ============================================================================

-- Check the complete user profile
SELECT 
  u.id,
  u.name,
  u.email,
  u.username,
  u.role,
  u.status,
  u.auth_user_id,
  COUNT(p.id) as permission_count,
  STRING_AGG(p.permission_key, ', ') as permissions
FROM public.users u
LEFT JOIN public.user_permissions p ON u.id = p.user_id AND p.granted = true
WHERE u.email = 'admin@admin.com'
GROUP BY u.id, u.name, u.email, u.username, u.role, u.status, u.auth_user_id;

-- Expected result:
-- ✅ User exists in public.users
-- ✅ auth_user_id is populated
-- ✅ permission_count > 0
-- ✅ status = 'active'

-- ============================================================================
-- STEP 8: TEST LOGIN (from application)
-- ============================================================================

-- After running the fixes above:
-- 1. Go to Login page in your application
-- 2. Enter email: admin@admin.com
-- 3. Enter password: (the password you set when creating)
-- 4. Click Login
-- 
-- Expected: Dashboard loads, user is authenticated
-- 
-- If still failing:
-- - Check browser console for exact error
-- - Run Step 1 & 2 again to verify database state
-- - Check if RLS policies are blocking access

-- ============================================================================
-- DEBUGGING: Check what happens during login attempt
-- ============================================================================

-- If user exists but login still fails, check:

-- 1. Is the email verified?
SELECT 
  id,
  email,
  email_confirmed_at,
  (raw_user_meta_data->>'email_verified')::boolean as email_verified_meta
FROM auth.users
WHERE email = 'admin@admin.com';

-- 2. Is the user suspended/locked?
SELECT 
  id,
  email,
  (raw_user_meta_data->>'disabled')::boolean as disabled,
  (raw_user_meta_data->>'frozen')::boolean as frozen
FROM auth.users
WHERE email = 'admin@admin.com';

-- 3. Check recent auth logs (if available)
-- Note: Audit logs might not be available on free tier
SELECT 
  id,
  user_id,
  action,
  created_at
FROM audit_log
WHERE action LIKE '%auth%' OR action LIKE '%login%'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- QUICK REFERENCE: What the RPC function does
-- ============================================================================

-- When you click "Create User" in Utilisateurs page, this happens:
-- 
-- 1. Frontend calls: supabase.rpc('create_worker_account', {...})
-- 2. Backend PostgreSQL function does:
--    a. INSERT into auth.users (creates authentication record)
--    b. INSERT into public.users (creates application user record)
--    c. INSERT into user_permissions (grants default permissions)
--    d. Links them via auth_user_id
--    e. RETURNS success with auth_user_id
-- 3. Frontend shows success message
-- 4. User can immediately login with email + password
-- 
-- Total time: atomic transaction, all-or-nothing

-- ============================================================================
-- END OF DIAGNOSTIC & FIX SQL
-- ============================================================================
