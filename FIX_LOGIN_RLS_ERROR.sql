/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FIX: Remove RLS and Fix Login Authentication Error
 * 
 * The "Database error querying schema" error happens when RLS blocks
 * Supabase Auth from querying the database during login.
 * 
 * This SQL:
 * 1. Disables RLS on ALL tables
 * 2. Grants proper permissions to auth users
 * 3. Ensures login works properly
 * 
 * Run this in Supabase SQL Editor as postgres role.
 */

-- ============================================================================
-- 1. DISABLE RLS ON ALL TABLES (This fixes the login error)
-- ============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'transactions', 'banks', 'clients', 'suppliers', 'debts', 'appointments',
    'cash_divisions', 'transaction_categories', 'company_settings', 'users',
    'user_permissions', 'products', 'ventes', 'vente_lines', 'achats', 'achat_lines',
    'bons_commande', 'bon_commande_lines', 'bons_livraison', 'bon_livraison_lines',
    'bons_reception', 'bon_reception_lines', 'factures_proformat',
    'facture_proformat_lines', 'inventaires', 'inventaire_lines', 'productions',
    'production_items', 'stock_movements', 'transfers', 'debt_payments',
    'client_debt_payments', 'client_debts', 'document_sequences',
    'cash_counts', 'saved_reports', 'audit_log', 'countries', 'product_families',
    'product_marks', 'product_sub_families', 'storage_locations', 'units_of_measure'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' DISABLE ROW LEVEL SECURITY';
      RAISE NOTICE 'Disabled RLS on %', t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not disable RLS on % (may not exist): %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- 2. DROP ALL RLS POLICIES (Clean up old policies)
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) ||
            ' ON public.' || quote_ident(policy_record.tablename);
    RAISE NOTICE 'Dropped policy % on %', policy_record.policyname, policy_record.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- 3. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Grant to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant to anon role (for development/testing only)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- ============================================================================
-- 4. GRANT SCHEMA USAGE
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT CREATE ON SCHEMA public TO authenticated;

-- ============================================================================
-- 5. VERIFY SETTINGS
-- ============================================================================

SELECT 'RLS Disabled and Permissions Granted Successfully!' AS status;

-- Check RLS status (should show no rows = RLS disabled everywhere)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
LIMIT 10;
-- If this returns rows, RLS is still enabled on those tables

-- Check policies (should be empty = no policies)
SELECT COUNT(*) as active_policies
FROM pg_policies
WHERE schemaname = 'public';
-- Should return 0

-- ============================================================================
-- 6. VERIFY AUTH USERS CAN BE QUERIED
-- ============================================================================

-- Test query (should work now)
SELECT COUNT(*) as total_auth_users FROM auth.users;
SELECT COUNT(*) as total_public_users FROM public.users;

-- ============================================================================
-- SUCCESS: Login should now work!
-- ============================================================================
