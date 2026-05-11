/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SIMPLE SETUP - Create Public Users Only
 * 
 * This creates the public.users entries.
 * You will manually create the auth accounts via Supabase Dashboard.
 */

-- ============================================
-- 1. DELETE EXISTING ENTRIES
-- ============================================
DELETE FROM public.user_permissions WHERE user_id IN (
  SELECT id FROM public.users WHERE email IN ('admin@admin.com', 'worker@test.com')
);
DELETE FROM public.users WHERE email IN ('admin@admin.com', 'worker@test.com');

-- ============================================
-- 2. CREATE PUBLIC USERS
-- ============================================

INSERT INTO public.users (
  name,
  username,
  email,
  role,
  status,
  created_at,
  updated_at
) VALUES 
  ('Admin User', 'admin', 'admin@admin.com', 'admin'::user_role, 'active'::user_status, NOW(), NOW()),
  ('Worker Test', 'worker', 'worker@test.com', 'worker'::user_role, 'active'::user_status, NOW(), NOW());

-- ============================================
-- 3. GRANT PERMISSIONS TO ADMIN
-- ============================================

INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT u.id, pc.key, true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com';

-- ============================================
-- 4. GRANT LIMITED PERMISSIONS TO WORKER
-- ============================================

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
-- 5. VERIFY
-- ============================================

SELECT 'Users and Permissions Created!' as status;
SELECT email, role, COUNT(*) as perm_count FROM public.users 
LEFT JOIN public.user_permissions ON public.users.id = public.user_permissions.user_id 
WHERE email IN ('admin@admin.com', 'worker@test.com') 
GROUP BY email, role;
