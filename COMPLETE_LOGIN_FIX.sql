/**
 * 🔐 COMPLETE LOGIN FIX FOR WORKER ACCOUNTS
 * 
 * Run this entire script in your Supabase SQL Editor (https://app.supabase.com)
 * This fixes the "Database error querying schema" (500) error during login.
 */

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 2. REPAIR EXISTING WORKER ACCOUNTS
-- ============================================
-- This ensures anyone already created can now log in.

-- Update app metadata for users missing it (required for JWT generation)
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
WHERE raw_app_meta_data IS NULL OR raw_app_meta_data = '{}'::jsonb;

-- Create missing identities (required for login flow)
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
    format('{"sub":"%s","email":"%s"}', u.id::text, u.email)::jsonb,
    'email',
    u.id::text,
    NOW(),
    u.created_at,
    u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- ============================================
-- 3. UPDATED CREATE_WORKER_ACCOUNT RPC
-- ============================================
-- This version correctly populates metadata and identities for future users.

DROP FUNCTION IF EXISTS public.create_worker_account(text, text, text, text, text, text);

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
BEGIN
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
    format('{"sub":"%s","email":"%s"}', v_auth_user_id::text, p_email)::jsonb,
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

  -- 4. Grant Permissions (Default set for workers)
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
-- 4. UPDATED DELETE_WORKER_ACCOUNT RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_worker_account(p_public_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_auth_id FROM public.users WHERE id = p_public_user_id;
  
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
    -- Note: public.users delete usually cascades from auth or handles via FK
    DELETE FROM public.users WHERE id = p_public_user_id;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- ✅ FINISH
-- ============================================
SELECT 'DATABASE FIX APPLIED SUCCESSFULLY! Workers can now login.' AS status;
