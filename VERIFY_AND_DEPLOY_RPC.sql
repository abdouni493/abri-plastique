-- ============================================================================
-- DEPLOYMENT: Run this in Supabase to verify and fix create_worker_account
-- ============================================================================

-- Step 1: Check if function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_worker_account'
AND routine_schema = 'public';

-- If no results, you MUST run: FIX_CREATE_WORKER_ACCOUNT_RPC.sql

-- ============================================================================
-- Step 2: Test the function manually
-- ============================================================================

-- Run this test to verify it works:
SELECT public.create_worker_account(
  p_email := 'testuser' || to_char(now(), 'YYYYMMDDHH24MISS') || '@test.com',
  p_password := 'Test123456',
  p_name := 'Test User',
  p_username := 'test_user_' || to_char(now(), 'YYYYMMDDHH24MISS'),
  p_phone := NULL,
  p_role := 'worker'
);

-- Expected response:
-- {
--   "success": true,
--   "user_id": "550e8400-...",
--   "auth_user_id": "c7688b9c-...",
--   "message": "Worker account created successfully"
-- }

-- ============================================================================
-- Step 3: Verify records were created
-- ============================================================================

-- Check if test user was created in public.users:
SELECT id, email, auth_user_id, role, status
FROM public.users
WHERE email LIKE 'testuser%'
ORDER BY created_at DESC
LIMIT 1;

-- Check if test user was created in auth.users:
SELECT id, email, created_at
FROM auth.users
WHERE email LIKE 'testuser%'
ORDER BY created_at DESC
LIMIT 1;

-- Verify they're linked:
SELECT 
  pu.id as public_user_id,
  pu.email,
  pu.auth_user_id,
  au.id as auth_user_id,
  (pu.auth_user_id = au.id) as linked_correctly
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.email LIKE 'testuser%'
ORDER BY pu.created_at DESC
LIMIT 1;

-- ============================================================================
-- Step 4: If test succeeds, clean up test user
-- ============================================================================

-- Delete test records:
DELETE FROM public.user_permissions
WHERE user_id IN (
  SELECT id FROM public.users WHERE email LIKE 'testuser%'
);

DELETE FROM public.users
WHERE email LIKE 'testuser%';

DELETE FROM auth.users
WHERE email LIKE 'testuser%';

-- ============================================================================
-- CRITICAL: If function doesn't exist
-- ============================================================================
-- 1. Copy entire FIX_CREATE_WORKER_ACCOUNT_RPC.sql
-- 2. Go to Supabase SQL Editor
-- 3. Paste it
-- 4. Click "Execute"
-- 5. Wait for success
-- 6. Then come back to application and try again
