/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CREATE TEST WORKERS WITH PROPER AUTH
 * 
 * This SQL creates test worker accounts in Supabase Auth that you can use
 * to test the permission system.
 * 
 * Run this in Supabase SQL Editor as postgres role.
 */

-- ============================================
-- 1. CREATE ADMIN TEST ACCOUNT IN AUTH
-- ============================================

-- Delete if exists
DELETE FROM auth.users WHERE email = 'admin@admin.com';

-- Create admin user directly in auth.users
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
  '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid,
  'authenticated',
  'authenticated',
  'admin@admin.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  jsonb_build_object('name', 'Admin User'),
  '{"provider":"email","providers":["email"]}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create identity for admin
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
    '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid,
    format('{"sub":"%s","email":"%s"}', '47bc3611-fd76-4b14-a619-7c510e612ecb', 'admin@admin.com')::jsonb,
    'email',
    '47bc3611-fd76-4b14-a619-7c510e612ecb',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE WORKER TEST ACCOUNT IN AUTH
-- ============================================

-- Delete if exists
DELETE FROM auth.users WHERE email = 'worker@test.com';

-- Create worker user directly in auth.users
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
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'authenticated',
  'authenticated',
  'worker@test.com',
  crypt('worker123', gen_salt('bf')),
  NOW(),
  jsonb_build_object('name', 'Worker Test'),
  '{"provider":"email","providers":["email"]}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create identity for worker
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
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    format('{"sub":"%s","email":"%s"}', '550e8400-e29b-41d4-a716-446655440001', 'worker@test.com')::jsonb,
    'email',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. GET AUTH IDS AND CREATE PUBLIC.USERS RECORDS
-- ============================================

-- Get the auth IDs
WITH auth_ids AS (
  SELECT 
    email,
    id as auth_id
  FROM auth.users
  WHERE email IN ('admin@admin.com', 'worker@test.com')
)
DELETE FROM public.users 
WHERE email IN (SELECT email FROM auth_ids);

-- Create admin in public.users
INSERT INTO public.users (
  name,
  username,
  email,
  role,
  status,
  auth_user_id,
  created_at,
  updated_at
) VALUES (
  'Admin User',
  'admin',
  'admin@admin.com',
  'admin'::user_role,
  'active'::user_status,
  (SELECT id FROM auth.users WHERE email = 'admin@admin.com'),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = (SELECT id FROM auth.users WHERE email = 'admin@admin.com'),
  role = 'admin'::user_role,
  status = 'active'::user_status;

-- Create worker in public.users
INSERT INTO public.users (
  name,
  username,
  email,
  role,
  status,
  auth_user_id,
  created_at,
  updated_at
) VALUES (
  'Worker Test',
  'worker',
  'worker@test.com',
  'worker'::user_role,
  'active'::user_status,
  (SELECT id FROM auth.users WHERE email = 'worker@test.com'),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = (SELECT id FROM auth.users WHERE email = 'worker@test.com'),
  role = 'worker'::user_role,
  status = 'active'::user_status;

-- ============================================
-- 4. GRANT ADMIN ALL PERMISSIONS
-- ============================================

DELETE FROM public.user_permissions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'admin@admin.com');

INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  u.id,
  pc.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com';

-- ============================================
-- 5. GRANT WORKER LIMITED PERMISSIONS
-- ============================================

DELETE FROM public.user_permissions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'worker@test.com');

-- Grant worker permissions for caisse mode only
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  u.id,
  pc.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'worker@test.com'
  AND pc.key IN (
    'view_dashboard',
    'view_caisse',
    'view_bank',
    'view_transfer',
    'view_sales',
    'view_purchases',
    'pay_debts',
    'view_clients',
    'view_suppliers',
    'view_users',
    'view_reports',
    'view_settings'
  );

-- ============================================
-- 6. VERIFY SETUP
-- ============================================

SELECT 'Admin Account Created:' AS info;
SELECT name, email, role, status FROM public.users WHERE email = 'admin@admin.com';

SELECT 'Worker Account Created:' AS info;
SELECT name, email, role, status FROM public.users WHERE email = 'worker@test.com';

SELECT 'Permissions Summary:' AS info;
SELECT 
  u.email,
  u.role,
  COUNT(up.id) as permission_count
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.email IN ('admin@admin.com', 'worker@test.com')
GROUP BY u.id, u.email, u.role;

-- ============================================
-- 7. TEST ACCOUNTS
-- ============================================
-- Admin Login: admin@admin.com / admin123
-- Worker Login: worker@test.com / worker123
