-- ============================================================================
-- MANUAL FIX: How to Link Existing Auth User to Public User
-- ============================================================================
-- This SQL shows how to manually create the public.users record if you
-- already have an auth.users record but login is failing.
--
-- ⚠️  WARNING: Only use this if the RPC function isn't working
-- ⚠️  RECOMMENDED: Use Utilisateurs page instead
-- ============================================================================

-- ============================================================================
-- SCENARIO 1: You manually created an auth.users record
-- RESULT: Login returns "Database error querying schema" 500 error
-- SOLUTION: Create the corresponding public.users record
-- ============================================================================

-- STEP 1: Find the auth.users record
-- Run this to get the UUID:

SELECT 
  id as auth_user_id,
  email,
  raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'admin@admin.com'
LIMIT 1;

-- Copy the UUID from the "id" column
-- Example: c7688b9c-fde3-455a-9f59-42d05cf6acf2

-- ─────────────────────────────────────────────────────────────

-- STEP 2: Check if public.users record already exists

SELECT 
  id,
  email,
  auth_user_id,
  role,
  status
FROM public.users
WHERE email = 'admin@admin.com'
LIMIT 1;

-- If this returns a row:
--   → The record exists, but might not be linked properly
--   → See SCENARIO 2 below
--
-- If this returns no rows:
--   → The record is missing, use STEP 3 below

-- ─────────────────────────────────────────────────────────────

-- STEP 3: Create the public.users record

-- Replace c7688b9c-fde3-455a-9f59-42d05cf6acf2 with the UUID from STEP 1

INSERT INTO public.users (
  id,                        -- New UUID for this record
  name,                      -- Name from auth.users metadata
  username,                  -- Unique username (must create)
  email,                     -- Must match auth.users email
  phone,                     -- Optional
  role,                      -- 'admin' or 'worker'
  status,                    -- 'active', 'inactive', 'suspended'
  auth_user_id,              -- The UUID from auth.users.id
  created_at,                -- Now
  updated_at                 -- Now
) VALUES (
  gen_random_uuid(),                      -- Generate new ID for public user record
  'Administrator',                        -- Full name (from auth metadata or make up)
  'admin',                                -- Unique username
  'admin@admin.com',                      -- MUST match auth.users.email
  NULL,                                   -- Phone (optional)
  'admin'::user_role,                     -- Role: admin or worker
  'active'::user_status,                  -- Status: active by default
  'c7688b9c-fde3-455a-9f59-42d05cf6acf2', -- ← REPLACE WITH UUID FROM STEP 1
  now(),
  now()
) ON CONFLICT (email) 
DO UPDATE SET 
  auth_user_id = 'c7688b9c-fde3-455a-9f59-42d05cf6acf2',  -- ← REPLACE WITH UUID
  status = 'active'::user_status,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────

-- STEP 4: Verify the link was created

SELECT 
  pu.id as public_user_id,
  pu.email,
  pu.auth_user_id,
  au.id as auth_user_id,
  CASE 
    WHEN pu.auth_user_id = au.id THEN '✅ LINKED'
    ELSE '❌ NOT LINKED'
  END as link_status
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.email = 'admin@admin.com';

-- Expected output:
-- public_user_id | email              | auth_user_id           | auth_user_id          | link_status
-- ───────────────┼────────────────────┼───────────────────────┼───────────────────────┼──────────
-- 550e8400-...   | admin@admin.com    | c7688b9c-...          | c7688b9c-...          | ✅ LINKED

-- ─────────────────────────────────────────────────────────────

-- STEP 5: Grant permissions (if empty)

-- Check current permissions:
SELECT 
  COUNT(*) as permission_count,
  STRING_AGG(permission_key, ', ') as permissions
FROM public.user_permissions
WHERE user_id = (SELECT id FROM public.users WHERE email = 'admin@admin.com')
AND granted = true;

-- If permission_count = 0, grant admin permissions:

INSERT INTO public.user_permissions (
  user_id,
  permission_key,
  granted
)
SELECT 
  u.id,
  pc.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com'
ON CONFLICT (user_id, permission_key) 
DO UPDATE SET granted = true;

-- ─────────────────────────────────────────────────────────────

-- STEP 6: Test login
-- 1. Logout from dashboard
-- 2. Go to login page
-- 3. Enter: admin@admin.com + password
-- 4. Click login
-- ✅ Should work now!

-- ============================================================================
-- SCENARIO 2: Link is broken or incorrect
-- RESULT: Login fails or user data is wrong
-- SOLUTION: Fix the link
-- ============================================================================

-- Check current state:
SELECT 
  id,
  email,
  auth_user_id
FROM public.users
WHERE email = 'admin@admin.com';

-- If auth_user_id is NULL or wrong UUID:
-- Fix it:

UPDATE public.users
SET auth_user_id = 'c7688b9c-fde3-455a-9f59-42d05cf6acf2',  -- ← Correct UUID from auth.users
    updated_at = now()
WHERE email = 'admin@admin.com';

-- Verify:
SELECT 
  email,
  auth_user_id
FROM public.users
WHERE email = 'admin@admin.com';

-- ============================================================================
-- SCENARIO 3: Duplicate users
-- RESULT: Confusing, multiple records for same email
-- SOLUTION: Delete duplicates, keep the one with correct auth_user_id
-- ============================================================================

-- Find duplicates:
SELECT 
  email,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM public.users
WHERE email = 'admin@admin.com'
GROUP BY email
HAVING COUNT(*) > 1;

-- If there are duplicates:
-- 1. Identify which one has the correct auth_user_id
-- 2. Delete the others

DELETE FROM public.user_permissions
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email = 'admin@admin.com'
  AND id != (
    SELECT id FROM public.users
    WHERE email = 'admin@admin.com'
    AND auth_user_id IS NOT NULL
    LIMIT 1
  )
);

DELETE FROM public.users
WHERE email = 'admin@admin.com'
AND id != (
  SELECT id FROM public.users
  WHERE email = 'admin@admin.com'
  AND auth_user_id IS NOT NULL
  LIMIT 1
);

-- Verify only one remains:
SELECT id, email, auth_user_id FROM public.users WHERE email = 'admin@admin.com';

-- ============================================================================
-- SCENARIO 4: Complete cleanup and recreate
-- RESULT: Remove everything and start fresh
-- SOLUTION: Delete all records and recreate through app
-- ============================================================================

-- Delete all for this user:

DELETE FROM public.user_permissions
WHERE user_id IN (
  SELECT id FROM public.users WHERE email = 'admin@admin.com'
);

DELETE FROM public.users
WHERE email = 'admin@admin.com';

DELETE FROM auth.users
WHERE email = 'admin@admin.com';

-- Now go to Utilisateurs page and create the user through the application
-- This ensures proper linking and full setup

-- ============================================================================
-- REFERENCE: What to fill in for each field
-- ============================================================================

-- id:
--   → Generate new: gen_random_uuid()
--   → (Different from auth_user_id)

-- name:
--   → Full name of user: "Administrator"
--   → Can be any string

-- username:
--   → Unique identifier: "admin"
--   → Must be UNIQUE in public.users table
--   → Lowercase recommended

-- email:
--   → Must EXACTLY match auth.users.email
--   → MUST be UNIQUE in public.users table
--   → Case-insensitive but stored as provided

-- phone:
--   → Optional field
--   → Can be NULL or any phone string: "+213 555 123456"

-- role:
--   → 'admin'::user_role or 'worker'::user_role
--   → MUST cast as user_role enum

-- status:
--   → 'active'::user_status
--   → Other options: 'inactive', 'suspended'
--   → MUST cast as user_status enum

-- auth_user_id:
--   → The UUID from auth.users.id
--   → NOT a new UUID, must be EXACT match
--   → This is what links the records

-- created_at / updated_at:
--   → Usually now() for new records
--   → Or any timestamp: '2026-05-10 10:30:00'

-- ============================================================================
-- QUICK REFERENCE: Common Issues & SQL Fixes
-- ============================================================================

-- Issue: "Email already exists"
-- Fix: Use ON CONFLICT clause (shown above)

-- Issue: "Role 'admin' doesn't exist"
-- Fix: Must cast to enum: 'admin'::user_role

-- Issue: "Status 'active' doesn't exist"
-- Fix: Must cast to enum: 'active'::user_status

-- Issue: "Too many records"
-- Fix: See SCENARIO 3 for cleanup

-- Issue: "User still can't login"
-- Fix: Run verification queries in STEP 4 & 6 above

-- ============================================================================
-- IMPORTANT REMINDERS
-- ============================================================================

-- ⚠️  ALWAYS backup before running DELETE queries
-- ⚠️  Replace UUID placeholders with actual values
-- ⚠️  Email MUST match exactly (case-sensitive in comparison)
-- ⚠️  auth_user_id MUST NOT be NULL for login to work
-- ⚠️  Test login immediately after making changes
-- ⚠️  If still failing, check RLS policies and permissions

-- ============================================================================
-- RECOMMENDED: Use Application Instead
-- ============================================================================

-- All the above is manual work that the application does automatically!
--
-- Instead of running these SQL queries:
-- 
-- 1. Go to Utilisateurs page
-- 2. Click "Nouveau Membre"
-- 3. Fill form
-- 4. Click "Create"
-- 5. Done! ✅
--
-- The RPC function does:
-- ✓ INSERT into auth.users
-- ✓ INSERT into public.users
-- ✓ Link via auth_user_id
-- ✓ Set permissions
-- ✓ Handle errors
-- ✓ Return auth_user_id for reference
--
-- Much simpler and guaranteed to work!

-- ============================================================================
-- END OF MANUAL FIX GUIDE
-- ============================================================================
