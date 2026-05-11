/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FIX: Create Missing RPC Functions for User Management
 * 
 * This SQL creates the missing create_worker_account() and delete_worker_account()
 * RPC functions that Utilisateurs.tsx depends on.
 * 
 * Run this in Supabase SQL Editor as postgres role.
 */

-- ============================================================================
-- 1. ENABLE PGCRYPTO EXTENSION (required for gen_salt and crypt)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. CREATE OR UPDATE THE create_worker_account() RPC FUNCTION
-- ============================================================================
-- This function:
-- - Creates an auth user in Supabase Authentication with encrypted password
-- - Creates a public.users record linked to the auth user
-- - Grants appropriate permissions (admin=all, worker=limited)
-- - Worker can login immediately with email + password
-- - Returns success/failure status with user IDs
--
-- HOW IT WORKS FOR WORKER LOGIN:
-- 1. Worker created via Utilisateurs UI
-- 2. create_worker_account() called with email + password
-- 3. Account inserted into auth.users with encrypted password
-- 4. Public profile created in public.users
-- 5. Worker goes to login page
-- 6. Enters email + password
-- 7. Supabase Auth verifies credentials and logs them in
-- 8. User can access app with their permissions
--
DROP FUNCTION IF EXISTS public.create_worker_account(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_phone text,
  p_role text
);

CREATE FUNCTION public.create_worker_account(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'worker'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_user_id uuid;
BEGIN
  -- Input validation
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name is required');
  END IF;
  
  IF p_username IS NULL OR p_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is required');
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('admin', 'worker') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role: must be admin or worker');
  END IF;
  
  BEGIN
    -- 1. Create auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('name', p_name),
      '{"provider":"email","providers":["email"]}'::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_auth_user_id;

    -- 1.1 Create identity record (required for login in modern Supabase)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_auth_user_id,
      format('{"sub":"%s","email":"%s"}', v_auth_user_id::text, p_email)::jsonb,
      'email',
      v_auth_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );
    
    -- 2. Create public user record
    INSERT INTO public.users (
      name,
      username,
      email,
      phone,
      role,
      status,
      auth_user_id,
      created_at,
      updated_at
    ) VALUES (
      p_name,
      p_username,
      p_email,
      p_phone,
      p_role::user_role,
      'active'::user_status,
      v_auth_user_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_id;
    
    -- 3. Grant admin all permissions, worker gets limited
    IF p_role = 'admin' THEN
      INSERT INTO public.user_permissions (user_id, permission_key, granted)
      SELECT v_user_id, key, true
      FROM public.permissions_catalog;
    ELSE
      -- Worker gets limited permissions
      INSERT INTO public.user_permissions (user_id, permission_key, granted)
      SELECT v_user_id, key, true
      FROM public.permissions_catalog
      WHERE key IN (
        'view_dashboard',
        'view_caisse',
        'create_transaction',
        'edit_transaction',
        'view_bank',
        'view_transfer',
        'view_sales',
        'view_purchases',
        'pay_debts',
        'view_clients',
        'view_suppliers',
        'view_reports'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'auth_user_id', v_auth_user_id,
      'message', 'Worker account created successfully'
    );
    
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email or username already exists');
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid reference data');
    WHEN check_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Data validation failed');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- ============================================================================
-- 3. CREATE OR UPDATE THE delete_worker_account() RPC FUNCTION
-- ============================================================================
-- This function:
-- - Deletes the auth user
-- - Deletes the public.users record (cascades to permissions)
--
DROP FUNCTION IF EXISTS public.delete_worker_account(p_public_user_id uuid);

CREATE FUNCTION public.delete_worker_account(
  p_public_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  -- Input validation
  IF p_public_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;
  
  BEGIN
    -- 1. Get the auth user ID
    SELECT auth_user_id INTO v_auth_user_id
    FROM public.users
    WHERE id = p_public_user_id;
    
    IF v_auth_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- 2. Delete from auth.users (will cascade delete public.users if FK is set up)
    -- Or delete from public.users first, then auth.users
    DELETE FROM public.users WHERE id = p_public_user_id;
    
    DELETE FROM auth.users WHERE id = v_auth_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Worker account deleted successfully'
    );
    
  EXCEPTION 
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: user has dependent records');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- ============================================================================
-- 4. FIX EMAIL CHECK CONSTRAINT (if needed)
-- ============================================================================
-- The error "violates check constraint users_email_check" means there's a
-- CHECK constraint on the email column. Let's verify and fix it.

-- Check if the constraint exists
-- If it's too restrictive, we need to modify it
-- First, let's see what constraints exist:

-- Get constraint details (informational query):
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE table_name = 'users';

-- If you get the email constraint error, the constraint might be:
-- CONSTRAINT users_email_check CHECK (email ~* '...')

-- Let's add a more permissive email check if needed:
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_email_check;

-- Add improved email validation (allows common email formats)
ALTER TABLE public.users
ADD CONSTRAINT users_email_check 
CHECK (
  email IS NULL 
  OR (
    email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    AND LENGTH(email) > 5
    AND LENGTH(email) <= 254
  )
);

-- ============================================================================
-- 5. VERIFY FUNCTIONS WERE CREATED
-- ============================================================================

SELECT 'RPC Functions Created Successfully!' AS status;

-- ============================================================================
-- 6. VERIFY WORKER CAN LOGIN (Test Query)
-- ============================================================================
-- After running the above CREATE FUNCTION statements, workers will be able to login.
-- Supabase authentication flow:
--
-- Frontend Login Code:
-- ```typescript
-- const { data, error } = await supabase.auth.signInWithPassword({
--   email: 'worker@example.com',
--   password: 'their_password'
-- });
-- ```
--
-- How it works:
-- 1. Frontend sends email + password to Supabase Auth
-- 2. Supabase Auth looks up user in auth.users by email
-- 3. Compares provided password with encrypted_password using crypt()
-- 4. If match: returns session + user data
-- 5. If no match: returns authentication error
--
-- Note: The password is NEVER sent to your app backend - it's handled by Supabase Auth
--
-- Test the function (uncomment to verify):
-- SELECT public.create_worker_account(
--   p_email := 'testworker@example.com',
--   p_password := 'TestPassword123',
--   p_name := 'Test Worker',
--   p_username := 'testworker_new',
--   p_phone := '+212612345678',
--   p_role := 'worker'
-- );
--
-- After running above, verify:
-- 1. User created in auth.users:
--    SELECT email, role FROM auth.users WHERE email = 'testworker@example.com';
--
-- 2. Public profile created:
--    SELECT email, username, role FROM public.users WHERE email = 'testworker@example.com';
--
-- 3. Permissions granted:
--    SELECT COUNT(*) FROM public.user_permissions 
--    WHERE user_id = (SELECT id FROM public.users WHERE email = 'testworker@example.com');
--
-- Then try logging in with: testworker@example.com / TestPassword123
--
