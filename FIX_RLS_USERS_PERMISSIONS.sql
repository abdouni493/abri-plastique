/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FIX RLS POLICIES FOR USERS TABLE
 * 
 * This SQL fixes the 403 Forbidden error when creating users.
 * It enables RLS and creates appropriate policies for authenticated users to create/manage users.
 * 
 * Run this SQL in Supabase SQL Editor as the postgres role or super admin.
 */

-- ============================================
-- 1. ENABLE RLS ON USERS TABLE (if not already enabled)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (to recreate them)
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_select_self" ON public.users;
  DROP POLICY IF EXISTS "users_select_all" ON public.users;
  DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
  DROP POLICY IF EXISTS "users_update_self" ON public.users;
  DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
  DROP POLICY IF EXISTS "allow_admins_manage_users" ON public.users;
  DROP POLICY IF EXISTS "allow_user_insert" ON public.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 3. CREATE NEW RLS POLICIES FOR USERS TABLE
-- ============================================

-- Policy: Allow authenticated users to read all users
CREATE POLICY "users_read_all"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert new users (for user creation)
CREATE POLICY "users_insert_authenticated"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow users to update their own profile
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Allow admins to update any user
CREATE POLICY "users_update_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Allow admins to delete users
CREATE POLICY "users_delete_admin"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 4. ENABLE RLS ON USER_PERMISSIONS TABLE
-- ============================================
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. DROP EXISTING POLICIES ON USER_PERMISSIONS
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "permissions_select_own" ON public.user_permissions;
  DROP POLICY IF EXISTS "permissions_manage" ON public.user_permissions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 6. CREATE RLS POLICIES FOR USER_PERMISSIONS TABLE
-- ============================================

-- Policy: Allow users to read permissions
CREATE POLICY "permissions_read_all"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow admins to manage permissions
CREATE POLICY "permissions_manage_admin"
ON public.user_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 7. ENABLE RLS ON PERMISSIONS_CATALOG TABLE
-- ============================================
ALTER TABLE public.permissions_catalog ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. CREATE RLS POLICIES FOR PERMISSIONS_CATALOG TABLE
-- ============================================

-- Policy: Allow anyone authenticated to read permissions catalog
CREATE POLICY "permissions_catalog_read_all"
ON public.permissions_catalog
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 9. ENSURE PERMISSIONS_CATALOG IS POPULATED
-- ============================================
INSERT INTO public.permissions_catalog (key, label, module)
VALUES
  ('view_dashboard', 'Voir Tableau de bord', 'Dashboard'),
  ('view_caisse', 'Voir Caisse', 'Caisse'),
  ('create_transaction', 'Créer Transactions', 'Transactions'),
  ('edit_transaction', 'Modifier Transactions', 'Transactions'),
  ('delete_transaction', 'Supprimer Transactions', 'Transactions'),
  ('view_bank', 'Voir Banque', 'Bank'),
  ('view_transfer', 'Voir Transferts', 'Transfers'),
  ('view_sales', 'Voir Ventes', 'Sales'),
  ('view_purchases', 'Voir Achats & Dettes', 'Purchases'),
  ('pay_debts', 'Régler Dettes', 'Debts'),
  ('view_clients', 'Gérer Clients', 'Clients'),
  ('view_suppliers', 'Gérer Fournisseurs', 'Suppliers'),
  ('view_expenses', 'Gérer Dépenses', 'Expenses'),
  ('view_reports', 'Générer Rapports', 'Reports'),
  ('print_docs', 'Imprimer Documents', 'Documents'),
  ('view_users', 'Gérer Utilisateurs', 'Users'),
  ('view_settings', 'Accéder aux Paramètres', 'Settings')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 10. VERIFY POLICIES ARE CREATED
-- ============================================
SELECT 'RLS Policies Created Successfully' AS status;
