/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FIX BROKEN AUTH ACCOUNTS
 * 
 * This SQL removes the broken auth entries and recreates them properly
 * Run this in Supabase SQL Editor
 */

-- ============================================
-- 1. ENABLE PGCRYPTO EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 2. DELETE BROKEN ENTRIES
-- ============================================
DELETE FROM auth.users WHERE email IN ('admin@admin.com', 'worker@test.com');
DELETE FROM public.user_permissions WHERE user_id IN (
  SELECT id FROM public.users WHERE email IN ('admin@admin.com', 'worker@test.com')
);
DELETE FROM public.users WHERE email IN ('admin@admin.com', 'worker@test.com');

-- ============================================
-- 3. RECREATE WITH PROPER SUPABASE FORMAT
-- ============================================

-- Create admin user
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
  last_sign_in_at,
  confirmation_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid,
  'authenticated',
  'authenticated',
  'admin@admin.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"name":"Admin User"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  NOW()
);

-- Create worker user
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
  last_sign_in_at,
  confirmation_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'authenticated',
  'authenticated',
  'worker@test.com',
  crypt('worker123', gen_salt('bf')),
  NOW(),
  '{"name":"Worker Test"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  NOW()
);

-- ============================================
-- 4. CREATE PUBLIC USERS
-- ============================================

INSERT INTO public.users (
  name,
  username,
  email,
  role,
  status,
  auth_user_id,
  created_at,
  updated_at
) VALUES 
  ('Admin User', 'admin', 'admin@admin.com', 'admin'::user_role, 'active'::user_status, '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid, NOW(), NOW()),
  ('Worker Test', 'worker', 'worker@test.com', 'worker'::user_role, 'active'::user_status, '550e8400-e29b-41d4-a716-446655440001'::uuid, NOW(), NOW());

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

-- Admin gets all permissions
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT u.id, pc.key, true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com';

-- Worker gets limited permissions
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT u.id, pc.key, true
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
-- 6. VERIFY
-- ============================================

SELECT 'Setup Complete!' as status;
SELECT email, role, email_confirmed_at FROM auth.users WHERE email IN ('admin@admin.com', 'worker@test.com');
SELECT email, role, COUNT(*) as perm_count FROM public.users LEFT JOIN public.user_permissions ON public.users.id = public.user_permissions.user_id WHERE email IN ('admin@admin.com', 'worker@test.com') GROUP BY email, role;
