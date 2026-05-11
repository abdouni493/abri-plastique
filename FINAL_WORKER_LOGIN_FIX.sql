/**
 * 🔐 FINAL WORKER LOGIN FIX
 * 
 * This script fixes the "Database error querying schema" (500) error.
 * It repairs existing worker accounts and updates the creation logic.
 * 
 * 🚀 HOW TO USE:
 * 1. Copy this entire script.
 * 2. Paste it into your Supabase SQL Editor.
 * 3. Run it.
 * 4. Try logging in with your worker account.
 */

-- ============================================
-- 1. SETUP & DISCOVER PROJECT CONFIG
-- ============================================

DO $$
DECLARE
    v_instance_id uuid;
BEGIN
    -- Discover the actual instance_id from an existing user (usually admin)
    SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
    
    -- If no users exist, default to all zeros (standard Supabase default)
    IF v_instance_id IS NULL THEN
        v_instance_id := '00000000-0000-0000-0000-000000000000';
    END IF;

    RAISE NOTICE 'Using Instance ID: %', v_instance_id;

    -- ============================================
    -- 2. REPAIR AUTH.USERS TABLE
    -- ============================================
    
    -- Ensure all users have correct basic auth fields
    UPDATE auth.users
    SET 
        instance_id = v_instance_id,
        aud = 'authenticated',
        role = 'authenticated',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = NOW()
    WHERE email_confirmed_at IS NULL 
       OR raw_app_meta_data IS NULL 
       OR raw_app_meta_data = '{}'::jsonb
       OR instance_id IS NULL;

    -- ============================================
    -- 3. REPAIR AUTH.IDENTITIES TABLE
    -- ============================================
    -- This is the most common cause of the 500 error.
    
    -- First, remove any potentially broken identities for email users
    -- to avoid unique constraint violations during re-insertion.
    DELETE FROM auth.identities 
    WHERE provider = 'email' 
    AND user_id IN (SELECT id FROM auth.users);

    -- Insert fresh, clean identity records
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        u.id,
        -- Correct identity_data format for Supabase GoTrue
        jsonb_build_object(
            'sub', u.id::text,
            'email', u.email,
            'email_verified', true
        ),
        'email',
        u.id::text, -- For email provider, provider_id is usually the user_id
        NOW(),
        u.created_at,
        u.updated_at
    FROM auth.users u;

END $$;

-- ============================================
-- 4. RECREATE WORKER ACCOUNT RPC (Bulletproof Version)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_worker_account(
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
  v_instance_id uuid;
BEGIN
  -- Discover instance_id internally (no SET parameter needed)
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- 1. Create auth user with full metadata
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
    v_instance_id,
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

  -- 2. Create identity record (MANDATORY for login)
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
    jsonb_build_object(
        'sub', v_auth_user_id::text,
        'email', p_email,
        'email_verified', true
    ),
    'email',
    v_auth_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. Create public profile
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

  -- 4. Grant Permissions
  IF p_role = 'admin' THEN
    INSERT INTO public.user_permissions (user_id, permission_key, granted)
    SELECT v_user_id, key, true FROM public.permissions_catalog;
  ELSE
    INSERT INTO public.user_permissions (user_id, permission_key, granted)
    SELECT v_user_id, key, true FROM public.permissions_catalog
    WHERE key IN ('view_dashboard', 'view_caisse', 'create_transaction', 'view_bank', 'view_sales', 'view_purchases', 'view_reports');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'auth_user_id', v_auth_user_id,
    'message', 'Account created successfully'
  );

EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email or username already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 5. FINAL CLEANUP: Ensure everyone has a public profile
-- ============================================
INSERT INTO public.users (name, username, email, role, status, auth_user_id)
SELECT 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
    split_part(email, '@', 1),
    email,
    'worker'::user_role,
    'active'::user_status,
    id
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.users p WHERE p.auth_user_id = u.id)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- ✅ FINISH
-- ============================================
SELECT 'DATABASE REPAIRED SUCCESSFULLY! Try logging in now.' AS status;
