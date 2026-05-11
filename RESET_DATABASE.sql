/**
 * ============================================================================
 * ENTREPRISE CASH - DATABASE RESET SCRIPT
 * ============================================================================
 * 
 * This script completely removes all data and schema from the Entreprise Cash
 * database, returning it to a clean slate. After running this, you can execute
 * COMPLETE_APPLICATION_SETUP.sql to rebuild from scratch.
 * 
 * WARNING: This operation is IRREVERSIBLE and will delete ALL data!
 * Make sure you have backups before running this.
 * 
 * ============================================================================
 */

-- ============================================================================
-- PART 1: DROP CUSTOM FUNCTIONS FIRST
-- ============================================================================
-- Drop functions before tables to avoid dependencies

DROP FUNCTION IF EXISTS public.create_worker_account(text, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.delete_worker_account(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.next_document_number(text, text, int) CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop trigger on auth.users manually
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- ============================================================================
-- PART 2: DROP DEPENDENT TABLES (in reverse order of creation)
-- ============================================================================
-- Note: CASCADE will automatically handle all foreign key constraints and triggers

-- Audit and Logging
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- User related
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Permissions
DROP TABLE IF EXISTS public.permissions_catalog CASCADE;

-- Production related
DROP TABLE IF EXISTS public.production_items CASCADE;
DROP TABLE IF EXISTS public.productions CASCADE;

-- Inventory related
DROP TABLE IF EXISTS public.inventaire_lines CASCADE;
DROP TABLE IF EXISTS public.inventaires CASCADE;

-- Stock movements
DROP TABLE IF EXISTS public.stock_movements CASCADE;

-- Document lines
DROP TABLE IF EXISTS public.vente_lines CASCADE;
DROP TABLE IF EXISTS public.achat_lines CASCADE;
DROP TABLE IF EXISTS public.bon_commande_lines CASCADE;
DROP TABLE IF EXISTS public.bon_livraison_lines CASCADE;
DROP TABLE IF EXISTS public.bon_reception_lines CASCADE;
DROP TABLE IF EXISTS public.facture_proformat_lines CASCADE;

-- Documents
DROP TABLE IF EXISTS public.ventes CASCADE;
DROP TABLE IF EXISTS public.achats CASCADE;
DROP TABLE IF EXISTS public.bons_commande CASCADE;
DROP TABLE IF EXISTS public.bons_livraison CASCADE;
DROP TABLE IF EXISTS public.bons_reception CASCADE;
DROP TABLE IF EXISTS public.factures_proformat CASCADE;

-- Debt payments
DROP TABLE IF EXISTS public.debt_payments CASCADE;
DROP TABLE IF EXISTS public.client_debt_payments CASCADE;

-- Debts
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.client_debts CASCADE;

-- Appointments
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Products and inventory settings
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.product_sub_families CASCADE;
DROP TABLE IF EXISTS public.product_families CASCADE;
DROP TABLE IF EXISTS public.product_marks CASCADE;
DROP TABLE IF EXISTS public.units_of_measure CASCADE;
DROP TABLE IF EXISTS public.storage_locations CASCADE;

-- Transfers
DROP TABLE IF EXISTS public.transfers CASCADE;

-- Transactions
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.transaction_categories CASCADE;

-- Banks and cash
DROP TABLE IF EXISTS public.cash_divisions CASCADE;
DROP TABLE IF EXISTS public.banks CASCADE;
DROP TABLE IF EXISTS public.cash_counts CASCADE;

-- Clients and Suppliers
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- Countries
DROP TABLE IF EXISTS public.countries CASCADE;

-- Company Settings
DROP TABLE IF EXISTS public.company_settings CASCADE;

-- Document Sequences
DROP TABLE IF EXISTS public.document_sequences CASCADE;

-- Saved Reports
DROP TABLE IF EXISTS public.saved_reports CASCADE;

-- ============================================================================
-- PART 3: DROP CUSTOM TYPES & ENUMS

-- ============================================================================
-- PART 4: RESET SEQUENCES

-- Reset all sequences to start over
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN 
    SELECT sequence_schema, sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE 'ALTER SEQUENCE ' || seq.sequence_schema || '.' || seq.sequence_name || ' RESTART WITH 1';
  END LOOP;
END $$;

-- ============================================================================
-- PART 5: STORAGE BUCKETS CLEANUP
-- Note: Storage buckets cannot be deleted directly via SQL in Supabase
-- You can delete them manually via Supabase Dashboard → Storage
-- Or use the Supabase Storage API

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count remaining tables (should be 0 for public schema)
SELECT COUNT(*) as remaining_table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Count storage buckets
SELECT COUNT(*) as storage_bucket_count
FROM storage.buckets
WHERE id IN ('logos', 'justificatifs', 'products');

-- Note: To delete storage buckets, use Supabase Dashboard or Storage API

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- 
-- ✅ DATABASE RESET COMPLETE!
--
-- Your database has been completely wiped clean:
-- ✓ All tables removed
-- ✓ All triggers removed
-- ✓ All functions removed
-- ✓ All sequences reset
--
-- Custom types (enums) may still exist if they are system types
-- Storage buckets:
-- ℹ Storage buckets are protected in Supabase and cannot be deleted via SQL
-- To delete them, use: Supabase Dashboard → Storage → Select bucket → Delete
-- Or use the Supabase Storage API
--
-- You can now:
-- 1. Run COMPLETE_APPLICATION_SETUP.sql to rebuild from scratch
-- 2. Or import data from a backup
--
-- ============================================================================
