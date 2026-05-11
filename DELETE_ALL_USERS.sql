/**
 * ============================================================================
 * DELETE ALL USERS FROM SUPABASE AUTHENTICATION
 * ============================================================================
 * 
 * This script removes ALL users from the Supabase authentication system.
 * It deletes from both auth.identities and auth.users tables.
 * 
 * WARNING: This operation is IRREVERSIBLE and will delete ALL authentication users!
 * After running this, NO users will be able to login!
 * Make sure you have backups before running this.
 * 
 * ============================================================================
 */

-- ============================================================================
-- DELETE ALL AUTH USERS
-- ============================================================================

-- Step 1: Delete all identities (these reference auth.users via foreign key)
DELETE FROM auth.identities;

-- Step 2: Delete all users from auth.users
DELETE FROM auth.users;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all users have been deleted
SELECT COUNT(*) as remaining_auth_users
FROM auth.users;

-- Verify all identities have been deleted
SELECT COUNT(*) as remaining_identities
FROM auth.identities;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- 
-- ✅ ALL AUTHENTICATION USERS DELETED!
--
-- Your Supabase authentication has been completely cleared:
-- ✓ All auth.users deleted
-- ✓ All auth.identities deleted
--
-- IMPORTANT: 
-- - NO users can login anymore
-- - You need to create new users to regain access
-- - Run create_worker_account() RPC function to create new users
-- 
-- Next steps:
-- 1. Create a new admin account using: 
--    SELECT public.create_worker_account(
--      'admin@example.com', 
--      'password123', 
--      'Admin User', 
--      'admin', 
--      '1234567890', 
--      'admin'
--    );
-- 2. Login with the new admin account
-- 3. Create additional users as needed
--
-- ============================================================================
