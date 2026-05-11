/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VERIFICATION QUERIES - Check if RPC Functions Work
 * 
 * After running FIX_CREATE_WORKER_ACCOUNT_RPC.sql, run these queries
 * in Supabase SQL Editor to verify everything is working.
 */

-- ============================================================================
-- 1. VERIFY PGCRYPTO EXTENSION IS ENABLED
-- ============================================================================
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pgcrypto';

-- Expected output:
-- extname  | extversion
-- pgcrypto | 1.3

-- ============================================================================
-- 2. VERIFY RPC FUNCTIONS EXIST
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name IN ('create_worker_account', 'delete_worker_account')
  AND routine_schema = 'public';

-- Expected output (2 rows):
-- routine_name            | routine_type | data_type
-- create_worker_account   | FUNCTION     | jsonb
-- delete_worker_account   | FUNCTION     | jsonb

-- ============================================================================
-- 3. VERIFY EMAIL CONSTRAINT
-- ============================================================================
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE table_name = 'users'
  AND constraint_name = 'users_email_check';

-- Expected output:
-- constraint_name    | check_clause
-- users_email_check  | (email IS NULL OR ...)

-- ============================================================================
-- 4. TEST: Create a test user (OPTIONAL - uncomment to test)
-- ============================================================================
-- Running this will create a real test account
-- Uncomment the lines below and click Execute to test

/*
SELECT public.create_worker_account(
  p_email := 'test_' || to_char(now(), 'YYYYMMDDHH24MISS') || '@example.com',
  p_password := 'TestPassword123',
  p_name := 'Test User',
  p_username := 'testuser_' || to_char(now(), 'YYYYMMDDHH24MISS'),
  p_phone := '+212612345678',
  p_role := 'worker'
);

-- This should return something like:
-- {
--   "success": true,
--   "user_id": "550e8400-e29b-41d4-a716-446655440002",
--   "auth_user_id": "550e8400-e29b-41d4-a716-446655440003",
--   "message": "Worker account created successfully"
-- }
*/

-- ============================================================================
-- 5. VIEW ALL CREATED USERS
-- ============================================================================
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
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 6. VIEW PERMISSIONS FOR A USER (if needed)
-- ============================================================================
-- Replace 'john_doe' with the actual username
-- SELECT 
--   u.username,
--   COUNT(up.id) as permission_count,
--   STRING_AGG(up.permission_key, ', ') as permissions
-- FROM public.users u
-- LEFT JOIN public.user_permissions up ON u.id = up.user_id
-- WHERE u.username = 'john_doe'
-- GROUP BY u.username;

-- ============================================================================
-- SUCCESS INDICATOR
-- ============================================================================
-- If all queries above return results without errors, you're good to go! ✅
-- The Utilisateurs.tsx create user form should now work.
