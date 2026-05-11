/**
 * 🔐 CLONE_ADMIN_AUTH_FIX.sql
 * 
 * This script resolves the "Database error querying schema" (500) error during login.
 * It clones the authentication configuration from a functional Admin account to all 
 * worker accounts, ensuring they share the same valid instance_id and identity structure.
 * 
 * 🚀 INSTRUCTIONS:
 * 1. Copy this entire script.
 * 2. Go to your Supabase Dashboard -> SQL Editor.
 * 3. Paste and Run.
 * 4. Try logging in with your worker accounts.
 */

-- ============================================
-- 1. DISCOVERY: Find a valid Admin configuration
-- ============================================

DO $$
DECLARE
    v_admin_instance_id uuid;
    v_admin_aud text;
    v_admin_app_meta jsonb;
BEGIN
    -- Try to find the settings of a working admin (usually the first one created)
    SELECT instance_id, aud, raw_app_meta_data 
    INTO v_admin_instance_id, v_admin_aud, v_admin_app_meta
    FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Fallbacks if no user is found
    IF v_admin_instance_id IS NULL THEN
        v_admin_instance_id := '00000000-0000-0000-0000-000000000000';
    END IF;
    IF v_admin_aud IS NULL THEN v_admin_aud := 'authenticated'; END IF;
    IF v_admin_app_meta IS NULL THEN v_admin_app_meta := '{"provider":"email","providers":["email"]}'::jsonb; END IF;

    RAISE NOTICE 'Cloning Admin Config: Instance=% , AUD=%', v_admin_instance_id, v_admin_aud;

    -- ============================================
    -- 2. SYNC: Apply config to all users
    -- ============================================
    
    UPDATE auth.users
    SET 
        instance_id = v_admin_instance_id,
        aud = v_admin_aud,
        role = 'authenticated',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_app_meta_data = v_admin_app_meta,
        updated_at = NOW()
    WHERE instance_id IS NULL 
       OR instance_id != v_admin_instance_id
       OR aud IS NULL
       OR raw_app_meta_data IS NULL;

    -- ============================================
    -- 3. REPAIR: Identity Linking
    -- ============================================
    -- This is critical for the "signInWithPassword" flow.
    
    -- Clear potentially broken or duplicate identities
    DELETE FROM auth.identities 
    WHERE provider = 'email' 
    AND user_id IN (SELECT id FROM auth.users);

    -- Re-link every user to a fresh, valid email identity
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
        jsonb_build_object(
            'sub', u.id::text,
            'email', u.email,
            'email_verified', true
        ),
        'email',
        u.id::text,
        NOW(),
        u.created_at,
        u.updated_at
    FROM auth.users u;

END $$;

-- ============================================
-- 4. UPGRADE: Bulletproof User Creation RPC
-- ============================================
-- Updates the creation logic so new users are never born "broken".

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
  v_inst_id uuid;
BEGIN
  -- Auto-discover the working instance_id
  SELECT instance_id INTO v_inst_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  IF v_inst_id IS NULL THEN v_inst_id := '00000000-0000-0000-0000-000000000000'; END IF;

  -- 1. Create Auth User
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
    updated_at,
    is_super_admin
  ) VALUES (
    v_inst_id,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('name', p_name),
    '{"provider":"email","providers":["email"]}'::jsonb,
    NOW(),
    NOW(),
    false
  )
  RETURNING id INTO v_auth_user_id;

  -- 2. Create Identity (Crucial for Login)
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
        'email', LOWER(TRIM(p_email)),
        'email_verified', true
    ),
    'email',
    v_auth_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. Create Public Profile
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
    LOWER(TRIM(p_email)),
    p_phone,
    p_role::user_role,
    'active'::user_status,
    v_auth_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- 4. Default Permissions
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
    'message', 'Account created and synced successfully'
  );

EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email or username already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 5. VERIFICATION: Ensure profile consistency
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
SELECT 'AUTH REPAIRED: Workers are now synced with Admin settings. Try logging in.' AS status;
