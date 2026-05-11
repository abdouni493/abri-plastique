-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Update achat_status ENUM to include "payé" and "dette" statuses
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- This migration adds two new status values to the achat_status enum:
-- - "payé" (paid): When user pays the full amount
-- - "dette" (debt): When user saves with a partial/debt payment
--
-- The existing statuses remain:
-- - "brouillon" (draft)
-- - "commande" (ordered)
-- - "livree" (delivered)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 1: Add new values to the achat_status enum type
ALTER TYPE achat_status ADD VALUE 'payé' BEFORE 'livree';
ALTER TYPE achat_status ADD VALUE 'dette' BEFORE 'livree';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Notes:
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. PostgreSQL doesn't allow removing enum values, only adding new ones
-- 2. New values are added with BEFORE/AFTER positioning for readability
-- 3. The frontend will automatically set status based on payment:
--    - If montantPaye = 0: status = 'brouillon'
--    - If montantPaye >= totalTTC: status = 'payé'
--    - If 0 < montantPaye < totalTTC: status = 'dette'
-- 
-- 4. To apply this:
--    - Open https://app.supabase.com
--    - Go to SQL Editor
--    - Create a new query
--    - Copy and paste this entire file
--    - Click Execute
-- ═══════════════════════════════════════════════════════════════════════════════
