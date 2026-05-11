-- ═══════════════════════════════════════════════════════════════════════════════
-- GENERATED COLUMNS FIX - Convert DEFAULT expressions to GENERATED columns
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- These SQL scripts convert the DEFAULT expression columns to GENERATED ALWAYS AS
-- columns in all line tables AND products table. This prevents INSERT/UPDATE attempts 
-- from specifying these computed values, which caused "cannot insert a non-DEFAULT value" 
-- and 400 Bad Request errors.
-- 
-- The changes allow Supabase/PostgreSQL to automatically calculate totals and prices
-- based on source columns (quantity, prix_unit_ht, prix_achat_ht, tva values).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Step 1: Modify achat_lines table ─────────────────────────────────────────

-- Drop old DEFAULT constraints and recreate as GENERATED
ALTER TABLE public.achat_lines
DROP COLUMN total_ht,
DROP COLUMN total_tva,
DROP COLUMN total_ttc;

ALTER TABLE public.achat_lines
ADD COLUMN total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED,
ADD COLUMN total_tva numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * tva / 100) STORED,
ADD COLUMN total_ttc numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * (1 + tva / 100)) STORED;

-- ─── Step 2: Modify vente_lines table ────────────────────────────────────────

ALTER TABLE public.vente_lines
DROP COLUMN total_ht,
DROP COLUMN total_tva,
DROP COLUMN total_ttc;

ALTER TABLE public.vente_lines
ADD COLUMN total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED,
ADD COLUMN total_tva numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * tva / 100) STORED,
ADD COLUMN total_ttc numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * (1 + tva / 100)) STORED;

-- ─── Step 3: Modify bon_commande_lines table ────────────────────────────────

ALTER TABLE public.bon_commande_lines
DROP COLUMN total_ht,
DROP COLUMN total_tva,
DROP COLUMN total_ttc;

ALTER TABLE public.bon_commande_lines
ADD COLUMN total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED,
ADD COLUMN total_tva numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * tva / 100) STORED,
ADD COLUMN total_ttc numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * (1 + tva / 100)) STORED;

-- ─── Step 4: Modify bon_livraison_lines table ──────────────────────────────

ALTER TABLE public.bon_livraison_lines
DROP COLUMN total_ht,
DROP COLUMN total_tva,
DROP COLUMN total_ttc;

ALTER TABLE public.bon_livraison_lines
ADD COLUMN total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED,
ADD COLUMN total_tva numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * tva / 100) STORED,
ADD COLUMN total_ttc numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * (1 + tva / 100)) STORED;

-- ─── Step 5: Modify bon_reception_lines table ──────────────────────────────

ALTER TABLE public.bon_reception_lines
DROP COLUMN total_ht,
DROP COLUMN total_tva,
DROP COLUMN total_ttc;

ALTER TABLE public.bon_reception_lines
ADD COLUMN total_ht numeric GENERATED ALWAYS AS (quantity_recv * prix_unit_ht) STORED,
ADD COLUMN total_tva numeric GENERATED ALWAYS AS ((quantity_recv * prix_unit_ht) * tva / 100) STORED,
ADD COLUMN total_ttc numeric GENERATED ALWAYS AS ((quantity_recv * prix_unit_ht) * (1 + tva / 100)) STORED;

-- ─── Step 6: Modify facture_proformat_lines table ───────────────────────────

ALTER TABLE public.facture_proformat_lines
DROP COLUMN total_ht,
DROP COLUMN total_tva,
DROP COLUMN total_ttc;

ALTER TABLE public.facture_proformat_lines
ADD COLUMN total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED,
ADD COLUMN total_tva numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * tva / 100) STORED,
ADD COLUMN total_ttc numeric GENERATED ALWAYS AS ((quantity * prix_unit_ht) * (1 + tva / 100)) STORED;

-- ─── Step 7: Modify products table ──────────────────────────────────────────

-- prix_achat_ttc is calculated from prix_achat_ht and tva
-- Convert from DEFAULT to GENERATED ALWAYS AS
ALTER TABLE public.products
DROP COLUMN prix_achat_ttc;

ALTER TABLE public.products
ADD COLUMN prix_achat_ttc numeric GENERATED ALWAYS AS (prix_achat_ht * (1 + tva / 100)) STORED;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTES:
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- 1. GENERATED ALWAYS AS ... STORED:
--    - Automatically calculates the value every time a row is inserted or updated
--    - Cannot be manually set when inserting/updating
--    - Always reflects the current computed value
-- 
-- 2. This matches all the Frontend code that was trying to insert these calculated
--    values but will now let the database handle the calculation
-- 
-- 3. Code changes made to prevent INSERT/UPDATE errors:
--    - Achats.tsx: Removed total_ht, total_ttc from INSERT payload (2 places)
--    - Achats.tsx: Removed prix_achat_ttc from UPDATE products (line 1041)
--    - Ventes.tsx: Removed total_ht, total_ttc from INSERT payload (2 places)
--    - FactureProformat.tsx: Removed total_ht, total_ttc from INSERT payload
--    - BonCommande.tsx: Removed total_ht, total_ttc from INSERT payload
--    - BonReception.tsx: Shares code with BonCommande (fixed)
--    - BonLivraison.tsx: Shares code with BonCommande (fixed)
-- 
-- ═══════════════════════════════════════════════════════════════════════════════
