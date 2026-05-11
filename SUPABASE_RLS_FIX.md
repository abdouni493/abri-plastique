# Supabase RLS & Authentication Fix

## Problem Analysis

Your app is failing to load data due to two issues:

### Issue 1: Row Level Security (RLS) Policies Missing
The `src/lib/supabase.ts` uses the **Supabase anon key** correctly, but all tables have RLS enabled with **no permissive policies**. When RLS is on with no policies, **all queries are blocked by default** — even for authenticated users.

### Issue 2: User Profile Mismatch
`src/context/AuthContext.tsx` loads user data from the `public.users` table by matching the auth user's `id` with the `auth_user_id` column:
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*, user_permissions(permission_key, granted)')
  .eq('auth_user_id', authUserId)  // ← Matches auth user id with auth_user_id column
  .single();
```

**The problem:** When you create test users in Supabase Auth, you must also insert a matching row in `public.users` with the same `auth_user_id`. Otherwise, the profile lookup fails and login fails.

---

## Fix: Run This SQL in Supabase Dashboard

**Steps:**
1. Go to **Supabase Dashboard** > **SQL Editor**
2. Create a new query and paste the SQL below
3. Click **Execute**

### SQL Script

```sql
-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vente_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achat_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bon_commande_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_livraison ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bon_livraison_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_reception ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bon_reception_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures_proformat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facture_proformat_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventaire_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. CREATE PERMISSIVE POLICIES FOR AUTHENTICATED USERS
-- ============================================================
-- This allows authenticated users full CRUD access (SELECT, INSERT, UPDATE, DELETE)

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'transactions','banks','clients','suppliers','debts','appointments',
    'cash_divisions','transaction_categories','company_settings','users',
    'user_permissions','products','ventes','vente_lines','achats','achat_lines',
    'bons_commande','bon_commande_lines','bons_livraison','bon_livraison_lines',
    'bons_reception','bon_reception_lines','factures_proformat',
    'facture_proformat_lines','inventaires','inventaire_lines','productions',
    'production_items','stock_movements','transfers','debt_payments',
    'cash_counts','saved_reports'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "auth_full_access_%s"
      ON public.%I
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 3. INITIALIZE DEFAULT DATA
-- ============================================================

-- Create default company settings if missing
INSERT INTO public.company_settings (name, city)
VALUES ('Mon Entreprise', 'Alger')
ON CONFLICT DO NOTHING;

-- Create default transaction categories
INSERT INTO public.transaction_categories (name, is_system)
VALUES
  ('Vente', true),
  ('Achat', true),
  ('Salaire', true),
  ('Loyer', true),
  ('Utilities', true),
  ('Transfert Interne', true),
  ('Autre', true)
ON CONFLICT (name) DO NOTHING;
```

---

## After Running the SQL: Create Test User

Once the SQL is executed, you need to create a test user:

### Step 1: Create Auth User in Supabase Dashboard
1. Go to **Supabase Dashboard** > **Authentication** > **Users**
2. Click **Create User**
3. Enter email: `admin@admin.com` and password: `admin123`
4. Copy the **User ID** (UUID)

### Step 2: Link Auth User to App User
In **SQL Editor**, run:
```sql
INSERT INTO public.users (name, username, email, role, auth_user_id)
VALUES ('Admin', 'admin', 'admin@admin.com', 'admin', 'PASTE_UUID_HERE')
ON CONFLICT (username) DO NOTHING;
```

Replace `PASTE_UUID_HERE` with the UUID from Step 1.

---

## Code Verification

Your code is already correctly structured:

✅ **src/lib/supabase.ts** — Correctly creates client with anon key
✅ **src/context/AuthContext.tsx** — Correctly loads user profile from `public.users` by `auth_user_id`

The issue is purely **database-side**: missing RLS policies and missing user profile row.

---

## Testing

After running the SQL:
1. Go to app's login page
2. Enter `admin@admin.com` / `admin123`
3. App should now load data from all tables

If it still fails, check:
- Supabase logs for query errors
- Browser console for error details
- Verify the `auth_user_id` UUID matches exactly between Auth and the `public.users` table
