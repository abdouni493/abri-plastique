/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * WORKER LOGIN VERIFICATION - Database Checks
 * 
 * After running FIX_CREATE_WORKER_ACCOUNT_RPC.sql and creating a worker,
 * run these queries to verify the worker can login.
 */

-- ============================================================================
-- 1. VERIFY WORKER ACCOUNT IN AUTH.USERS (Supabase Auth)
-- ============================================================================
-- This query shows the account that will be used for login
-- Run this after creating a worker

SELECT 
  id AS auth_user_id,
  email,
  role,
  email_confirmed_at,
  created_at,
  (encrypted_password IS NOT NULL) AS password_set,
  (encrypted_password LIKE '$2a$%' OR encrypted_password LIKE '$2b$%') AS is_bcrypt_hash
FROM auth.users 
WHERE email = 'john.doe@example.com';  -- Replace with actual worker email

-- Expected output:
-- auth_user_id: 550e8400-e29b-41d4-a716-446655440003
-- email: john.doe@example.com
-- role: authenticated
-- email_confirmed_at: 2026-05-09 (not NULL = no confirmation required)
-- created_at: 2026-05-09
-- password_set: true
-- is_bcrypt_hash: true


-- ============================================================================
-- 2. VERIFY WORKER PUBLIC PROFILE (public.users)
-- ============================================================================
-- This query shows the public profile linked to the auth account

SELECT 
  id AS user_id,
  name,
  username,
  email,
  role,
  status,
  auth_user_id,
  created_at
FROM public.users 
WHERE email = 'john.doe@example.com';  -- Replace with actual worker email

-- Expected output:
-- user_id: 550e8400-e29b-41d4-a716-446655440002
-- name: John Doe
-- username: john_doe
-- email: john.doe@example.com
-- role: worker
-- status: active
-- auth_user_id: 550e8400-e29b-41d4-a716-446655440003 (matches auth_user_id above)
-- created_at: 2026-05-09


-- ============================================================================
-- 3. VERIFY WORKER PERMISSIONS
-- ============================================================================
-- This query shows what the worker can access

SELECT 
  u.email,
  u.role,
  COUNT(up.id) AS permission_count,
  STRING_AGG(up.permission_key, ', ' ORDER BY up.permission_key) AS permissions
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.email = 'john.doe@example.com'  -- Replace with actual worker email
GROUP BY u.id, u.email, u.role;

-- Expected output for worker:
-- email: john.doe@example.com
-- role: worker
-- permission_count: 12
-- permissions: create_transaction, edit_transaction, pay_debts, view_bank, ...


-- ============================================================================
-- 4. VERIFY AUTH-PUBLIC LINK INTEGRITY
-- ============================================================================
-- This query checks that the auth user and public user are properly linked

SELECT 
  au.email,
  (pu.id IS NOT NULL) AS has_public_profile,
  (au.id = pu.auth_user_id) AS auth_user_id_matches,
  COALESCE(COUNT(up.id), 0) AS permission_count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
LEFT JOIN public.user_permissions up ON pu.id = up.user_id
WHERE au.email = 'john.doe@example.com'  -- Replace with actual worker email
GROUP BY au.id, au.email, pu.id, pu.auth_user_id;

-- Expected output:
-- email: john.doe@example.com
-- has_public_profile: true
-- auth_user_id_matches: true
-- permission_count: 12 (or appropriate number)


-- ============================================================================
-- 5. TEST: VERIFY PASSWORD HASH CORRECTNESS (Optional)
-- ============================================================================
-- This query tests if the password hash works
-- Only for testing! Don't run in production frequently.

-- Compare the hash (should return TRUE if password is correct)
-- Uncomment and replace PASSWORD_HERE with actual password to test
-- SELECT 
--   'Password Test' AS test,
--   crypt('PASSWORD_HERE', 
--     (SELECT encrypted_password FROM auth.users WHERE email = 'john.doe@example.com')
--   ) = (SELECT encrypted_password FROM auth.users WHERE email = 'john.doe@example.com')
--   AS password_matches;

-- Expected output if correct password used:
-- test: Password Test
-- password_matches: true


-- ============================================================================
-- 6. COMPLETE LOGIN FLOW VERIFICATION
-- ============================================================================
-- This single query verifies everything needed for worker login

WITH worker_check AS (
  SELECT 
    au.id AS auth_id,
    au.email,
    pu.id AS user_id,
    pu.username,
    pu.role,
    pu.status,
    (pu.id IS NOT NULL) AS has_profile,
    (au.encrypted_password IS NOT NULL) AS has_password,
    (au.email_confirmed_at IS NOT NULL) AS email_confirmed
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.auth_user_id
  WHERE au.email = 'john.doe@example.com'
)
SELECT 
  email,
  role,
  status,
  CASE 
    WHEN has_profile AND has_password AND email_confirmed THEN 'READY TO LOGIN ✅'
    WHEN NOT has_profile THEN 'MISSING PUBLIC PROFILE ❌'
    WHEN NOT has_password THEN 'MISSING PASSWORD ❌'
    WHEN NOT email_confirmed THEN 'EMAIL NOT CONFIRMED ⚠️'
    ELSE 'UNKNOWN ERROR ❌'
  END AS login_status,
  auth_id,
  user_id
FROM worker_check;

-- Expected output:
-- email: john.doe@example.com
-- role: worker
-- status: active
-- login_status: READY TO LOGIN ✅
-- auth_id: 550e8400-e29b-41d4-a716-446655440003
-- user_id: 550e8400-e29b-41d4-a716-446655440002


-- ============================================================================
-- 7. VERIFY RPC FUNCTIONS EXIST AND ARE CALLABLE
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  data_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_worker_account', 'delete_worker_account')
ORDER BY routine_name;

-- Expected output (2 rows):
-- routine_name: create_worker_account
-- routine_type: FUNCTION
-- data_type: jsonb
-- security_type: SECURITY DEFINER

-- routine_name: delete_worker_account
-- routine_type: FUNCTION
-- data_type: jsonb
-- security_type: SECURITY DEFINER


-- ============================================================================
-- 8. SHOW ALL WORKERS (Summary)
-- ============================================================================

SELECT 
  u.name,
  u.email,
  u.username,
  u.role,
  u.status,
  COUNT(up.id) AS permission_count,
  (au.id IS NOT NULL) AS has_auth_account,
  u.created_at
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
LEFT JOIN auth.users au ON u.auth_user_id = au.id
WHERE u.role = 'worker'
GROUP BY u.id, u.email, au.id
ORDER BY u.created_at DESC;

-- This shows all workers and their status


-- ============================================================================
-- ✅ IF ALL QUERIES ABOVE WORK WITHOUT ERRORS:
-- ============================================================================
-- Workers can now login!
--
-- Frontend login flow:
-- 1. User enters email + password on login page
-- 2. Frontend calls: supabase.auth.signInWithPassword({email, password})
-- 3. Supabase Auth verifies against auth.users (bcrypt password hash)
-- 4. Returns session if credentials correct
-- 5. Frontend fetches public profile from public.users
-- 6. User can access app with their permissions
--
-- ============================================================================
