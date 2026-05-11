-- ============================================================================
-- DEBT PAYMENTS - Complete Setup for Clients & Suppliers
-- ============================================================================
-- This SQL ensures proper tracking of all payments for both client and 
-- supplier debts with unified interface
-- ============================================================================

-- ============================================================================
-- 1. ENSURE TABLES EXIST (verify structure)
-- ============================================================================

-- Client Debt Payments Table
CREATE TABLE IF NOT EXISTS public.client_debt_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  debt_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_mode text DEFAULT 'especes'::text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_debt_payments_pkey PRIMARY KEY (id),
  CONSTRAINT client_debt_payments_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.client_debts(id) ON DELETE CASCADE
);

-- Supplier Debt Payments Table
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  debt_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_mode text DEFAULT 'especes'::text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  transaction_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT debt_payments_pkey PRIMARY KEY (id),
  CONSTRAINT debt_payments_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.debts(id) ON DELETE CASCADE,
  CONSTRAINT debt_payments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT debt_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_client_debt_payments_debt_id ON public.client_debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_client_debt_payments_date ON public.client_debt_payments(date);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON public.debt_payments(date);
CREATE INDEX IF NOT EXISTS idx_debt_payments_created_by ON public.debt_payments(created_by);

-- ============================================================================
-- 3. CREATE UNIFIED PAYMENT HISTORY VIEW
-- ============================================================================
-- This view combines client and supplier payments for unified reporting

DROP VIEW IF EXISTS public.unified_debt_payments CASCADE;

CREATE VIEW public.unified_debt_payments AS
-- Client Debt Payments
SELECT 
  'client' as entity_type,
  'client_debt_payment' as payment_type,
  cdp.id as payment_id,
  cd.id as debt_id,
  cd.client_id as entity_id,
  NULL::uuid as supplier_id,
  c.name as entity_name,
  cd.invoice_number,
  cdp.amount,
  cdp.payment_mode,
  cdp.date,
  cdp.notes,
  cdp.created_at,
  cd.total_amount as total_debt,
  cd.paid_amount as total_paid_before,
  (cd.paid_amount + cdp.amount) as total_paid_after
FROM public.client_debt_payments cdp
JOIN public.client_debts cd ON cdp.debt_id = cd.id
JOIN public.clients c ON cd.client_id = c.id

UNION ALL

-- Supplier Debt Payments
SELECT 
  'supplier' as entity_type,
  'debt_payment' as payment_type,
  dp.id as payment_id,
  d.id as debt_id,
  NULL::uuid as entity_id,
  d.supplier_id,
  s.name as entity_name,
  d.invoice_number,
  dp.amount,
  dp.payment_mode::text,
  dp.date,
  dp.notes,
  dp.created_at,
  d.total_amount as total_debt,
  d.paid_amount as total_paid_before,
  (d.paid_amount + dp.amount) as total_paid_after
FROM public.debt_payments dp
JOIN public.debts d ON dp.debt_id = d.id
JOIN public.suppliers s ON d.supplier_id = s.id;

-- ============================================================================
-- 4. CREATE UNIFIED PAYMENT STATISTICS FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_entity_payment_stats(text, uuid);

CREATE OR REPLACE FUNCTION get_entity_payment_stats(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS TABLE (
  total_debts numeric,
  total_paid numeric,
  total_remaining numeric,
  payment_count bigint,
  last_payment_date date
) AS $$
BEGIN
  IF p_entity_type = 'client' THEN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(cd.total_amount), 0)::numeric as total_debts,
      COALESCE(SUM(cd.paid_amount), 0)::numeric as total_paid,
      COALESCE(SUM(cd.total_amount - COALESCE(cd.paid_amount, 0)), 0)::numeric as total_remaining,
      COUNT(DISTINCT cdp.id)::bigint as payment_count,
      MAX(cdp.date)::date as last_payment_date
    FROM public.client_debts cd
    LEFT JOIN public.client_debt_payments cdp ON cd.id = cdp.debt_id
    WHERE cd.client_id = p_entity_id;
  
  ELSIF p_entity_type = 'supplier' THEN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(d.total_amount), 0)::numeric as total_debts,
      COALESCE(SUM(d.paid_amount), 0)::numeric as total_paid,
      COALESCE(SUM(d.total_amount - COALESCE(d.paid_amount, 0)), 0)::numeric as total_remaining,
      COUNT(DISTINCT dp.id)::bigint as payment_count,
      MAX(dp.date)::date as last_payment_date
    FROM public.debts d
    LEFT JOIN public.debt_payments dp ON d.id = dp.debt_id
    WHERE d.supplier_id = p_entity_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE TRIGGER TO AUTO-UPDATE DEBT PAID_AMOUNT
-- ============================================================================

DROP TRIGGER IF EXISTS update_client_debt_on_payment ON public.client_debt_payments;
DROP FUNCTION IF EXISTS update_client_debt_paid_amount();

CREATE OR REPLACE FUNCTION update_client_debt_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.client_debts
  SET paid_amount = paid_amount + NEW.amount,
      updated_at = now()
  WHERE id = NEW.debt_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_debt_on_payment
AFTER INSERT ON public.client_debt_payments
FOR EACH ROW
EXECUTE FUNCTION update_client_debt_paid_amount();

DROP TRIGGER IF EXISTS update_supplier_debt_on_payment ON public.debt_payments;
DROP FUNCTION IF EXISTS update_supplier_debt_paid_amount();

CREATE OR REPLACE FUNCTION update_supplier_debt_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.debts
  SET paid_amount = paid_amount + NEW.amount,
      updated_at = now()
  WHERE id = NEW.debt_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_debt_on_payment
AFTER INSERT ON public.debt_payments
FOR EACH ROW
EXECUTE FUNCTION update_supplier_debt_paid_amount();

-- ============================================================================
-- 6. SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Get all payments for a specific client:
-- SELECT * FROM public.client_debt_payments 
-- WHERE debt_id IN (SELECT id FROM public.client_debts WHERE client_id = 'client-uuid')
-- ORDER BY date DESC;

-- Get all payments for a specific supplier:
-- SELECT * FROM public.debt_payments 
-- WHERE debt_id IN (SELECT id FROM public.debts WHERE supplier_id = 'supplier-uuid')
-- ORDER BY date DESC;

-- Get unified payment history:
-- SELECT * FROM public.unified_debt_payments
-- WHERE entity_type = 'client' AND entity_id = 'client-uuid'
-- ORDER BY date DESC;

-- Get payment statistics for a client:
-- SELECT * FROM get_entity_payment_stats('client', 'client-uuid');

-- Get payment statistics for a supplier:
-- SELECT * FROM get_entity_payment_stats('supplier', 'supplier-uuid');

-- ============================================================================
-- 7. SUMMARY
-- ============================================================================
-- ✅ Client debt payments table verified/created
-- ✅ Supplier debt payments table verified/created
-- ✅ Indexes created for performance
-- ✅ Unified payment history view created
-- ✅ Payment statistics function created
-- ✅ Auto-update triggers created for paid_amount
-- 
-- The system now properly tracks all payments for both clients and suppliers
-- ============================================================================
