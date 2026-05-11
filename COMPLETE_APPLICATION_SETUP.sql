/**
 * ============================================================================
 * ENTREPRISE CASH - COMPLETE DATABASE SETUP
 * ============================================================================
 * 
 * This SQL script sets up the entire database schema for the Entreprise Cash
 * application on a new Supabase project. It includes:
 * 
 * 1. Extensions
 * 2. Custom Types & Enums
 * 3. All Database Tables
 * 4. Triggers and Functions
 * 5. RPC Functions for User Management
 * 6. Storage Buckets Configuration
 * 7. Data Seeding (Permissions Catalog)
 * 
 * Run this in order in Supabase SQL Editor
 * 
 * @license Apache-2.0
 * ============================================================================
 */

-- ============================================================================
-- PART 1: ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 2: CREATE CUSTOM TYPES & ENUMS
-- ============================================================================

-- User roles
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'worker');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User status
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Transaction types
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('in', 'out');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payment modes
DO $$ BEGIN
  CREATE TYPE public.payment_mode AS ENUM ('especes', 'virement', 'cheque', 'traite', 'cash', 'transfer', 'check');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Document statuses
DO $$ BEGIN
  CREATE TYPE public.doc_status AS ENUM ('brouillon', 'confirme', 'envoye', 'payé', 'dette');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 3: CREATE TABLES
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 3.1 Users & Permissions
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'worker',
  status public.user_status NOT NULL DEFAULT 'active',
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE TABLE IF NOT EXISTS public.permissions_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  module TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions_catalog(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.2 Company & Settings
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  rip TEXT,
  nif TEXT,
  rs TEXT,
  article TEXT,
  validation_threshold NUMERIC DEFAULT 0,
  low_cash_alert_threshold NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.3 Cash Management
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cash_divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC NOT NULL,
  type public.transaction_type NOT NULL,
  category TEXT,
  date DATE NOT NULL,
  description TEXT,
  proof_url TEXT,
  source TEXT NOT NULL DEFAULT 'caisse',
  bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  payment_mode public.payment_mode,
  reference TEXT,
  virement_number TEXT,
  check_number TEXT,
  client_id UUID,
  supplier_id UUID,
  status TEXT DEFAULT 'validated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.4 Clients & Suppliers
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  nif TEXT,
  nis TEXT,
  article TEXT,
  rs TEXT,
  activite TEXT,
  wilaya TEXT,
  commune TEXT,
  famille TEXT,
  sous_famille TEXT,
  fax TEXT,
  rc_number TEXT,
  art_number TEXT,
  if_number TEXT,
  is_number TEXT,
  compte_bancaire TEXT,
  rib TEXT,
  site_web TEXT,
  solde_initial NUMERIC DEFAULT 0,
  date_initial DATE,
  tax_id TEXT,
  status TEXT DEFAULT 'actif',
  date_created DATE DEFAULT CURRENT_DATE,
  total_purchases NUMERIC DEFAULT 0,
  total_debt NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip TEXT,
  nif TEXT,
  nis TEXT,
  article TEXT,
  rs TEXT,
  activite TEXT,
  wilaya TEXT,
  commune TEXT,
  famille TEXT,
  sous_famille TEXT,
  fax TEXT,
  rc_number TEXT,
  art_number TEXT,
  if_number TEXT,
  is_number TEXT,
  compte_bancaire TEXT,
  rib TEXT,
  site_web TEXT,
  solde_initial NUMERIC DEFAULT 0,
  date_initial DATE,
  tax_id TEXT,
  status TEXT DEFAULT 'actif',
  date_created DATE DEFAULT CURRENT_DATE,
  total_supplies NUMERIC DEFAULT 0,
  total_debt NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.5 Sales & Purchases
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ventes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  montant_paye NUMERIC DEFAULT 0,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  payment_mode public.payment_mode,
  proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vente_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id UUID NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  product_id UUID,
  designation TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  prix_unit_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  montant_paye NUMERIC DEFAULT 0,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  payment_mode public.payment_mode,
  proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achat_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achat_id UUID NOT NULL REFERENCES public.achats(id) ON DELETE CASCADE,
  product_id UUID,
  designation TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  prix_unit_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.6 Purchase Orders (Bons de Commande)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bons_commande (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bon_commande_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bon_id UUID NOT NULL REFERENCES public.bons_commande(id) ON DELETE CASCADE,
  product_id UUID,
  designation TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  prix_unit_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.7 Delivery Notes (Bons de Livraison)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bons_livraison (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  bon_commande_id UUID,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bon_livraison_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bon_id UUID NOT NULL REFERENCES public.bons_livraison(id) ON DELETE CASCADE,
  product_id UUID,
  designation TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  prix_unit_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.8 Reception Notes (Bons de Réception)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bons_reception (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  bon_commande_id UUID,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bon_reception_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bon_id UUID NOT NULL REFERENCES public.bons_reception(id) ON DELETE CASCADE,
  product_id UUID,
  designation TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  prix_unit_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.9 Proforma Invoices (Factures Proformat)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.factures_proformat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.facture_proformat_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id UUID NOT NULL REFERENCES public.factures_proformat(id) ON DELETE CASCADE,
  product_id UUID,
  designation TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  prix_unit_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.10 Debts Management
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  invoice_number TEXT,
  invoice_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID REFERENCES public.debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode public.payment_mode,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  invoice_number TEXT,
  invoice_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID REFERENCES public.client_debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode public.payment_mode,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.11 Appointments
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID,
  entity_type TEXT,
  type TEXT NOT NULL,
  amount NUMERIC,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.12 Products & Inventory
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  designation TEXT NOT NULL,
  ref_product TEXT UNIQUE,
  bar_code TEXT UNIQUE,
  prix_achat_ht NUMERIC DEFAULT 0,
  prix_vente NUMERIC DEFAULT 0,
  tva NUMERIC DEFAULT 0,
  current_quantity NUMERIC DEFAULT 0,
  unite_mesure TEXT,
  famille TEXT,
  sous_famille TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  status public.doc_status DEFAULT 'brouillon',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventaire_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventaire_id UUID NOT NULL REFERENCES public.inventaires(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_counted NUMERIC NOT NULL DEFAULT 0,
  quantity_system NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.13 Production Management
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.productions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'brouillon',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_id UUID NOT NULL REFERENCES public.productions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_produced NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3.14 Document Sequences
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_sequences (
  id BIGSERIAL PRIMARY KEY,
  doc_type TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT 2024,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- PART 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_key ON public.user_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON public.transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON public.transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_ventes_client_id ON public.ventes(client_id);
CREATE INDEX IF NOT EXISTS idx_ventes_numero ON public.ventes(numero);
CREATE INDEX IF NOT EXISTS idx_achats_supplier_id ON public.achats(supplier_id);
CREATE INDEX IF NOT EXISTS idx_achats_numero ON public.achats(numero);

-- ============================================================================
-- PART 5: CREATE TRIGGERS & FUNCTIONS
-- ============================================================================

-- Trigger to keep profiles table in sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at) 
  VALUES (new.id, now())
  ON CONFLICT (id) DO UPDATE 
  SET updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ventes_updated_at BEFORE UPDATE ON public.ventes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achats_updated_at BEFORE UPDATE ON public.achats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 6: RPC FUNCTIONS
-- ============================================================================

-- Create Worker Account RPC
DROP FUNCTION IF EXISTS public.create_worker_account(text, text, text, text, text, text);

CREATE FUNCTION public.create_worker_account(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'worker'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_user_id uuid;
BEGIN
  -- Input validation
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name is required');
  END IF;
  
  IF p_username IS NULL OR p_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is required');
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('admin', 'worker') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role: must be admin or worker');
  END IF;
  
  BEGIN
    -- 1. Create auth user
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
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('name', p_name),
      '{"provider":"email","providers":["email"]}'::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_auth_user_id;

    -- 1.1 Create identity record
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
      v_auth_user_id,
      format('{"sub":"%s","email":"%s"}', v_auth_user_id::text, p_email)::jsonb,
      'email',
      v_auth_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );
    
    -- 2. Create public user record
    INSERT INTO public.users (
      name,
      username,
      email,
      phone,
      role,
      status,
      auth_user_id,
      created_at,
      updated_at
    ) VALUES (
      p_name,
      p_username,
      p_email,
      p_phone,
      p_role::public.user_role,
      'active'::public.user_status,
      v_auth_user_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_id;
    
    -- 3. Grant admin all permissions, worker gets limited
    IF p_role = 'admin' THEN
      INSERT INTO public.user_permissions (user_id, permission_key, granted)
      SELECT v_user_id, key, true
      FROM public.permissions_catalog;
    ELSE
      -- Worker gets limited permissions
      INSERT INTO public.user_permissions (user_id, permission_key, granted)
      SELECT v_user_id, key, true
      FROM public.permissions_catalog
      WHERE key IN (
        'view_dashboard',
        'view_caisse',
        'create_transaction',
        'edit_transaction',
        'view_bank',
        'view_transfer',
        'view_sales',
        'view_purchases',
        'pay_debts',
        'view_clients',
        'view_suppliers',
        'view_reports'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'auth_user_id', v_auth_user_id,
      'message', 'Worker account created successfully'
    );
    
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email or username already exists');
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid reference data');
    WHEN check_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Data validation failed');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- Delete Worker Account RPC
DROP FUNCTION IF EXISTS public.delete_worker_account(uuid);

CREATE FUNCTION public.delete_worker_account(p_public_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  SELECT auth_user_id INTO v_auth_id FROM public.users WHERE id = p_public_user_id;
  
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
  
  DELETE FROM public.users WHERE id = p_public_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Worker account deleted successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Generate Next Document Number RPC
DROP FUNCTION IF EXISTS public.next_document_number(text, text, int);

CREATE FUNCTION public.next_document_number(
  p_doc_type text, 
  p_prefix text, 
  p_year int
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO public.document_sequences (doc_type, prefix, last_seq, year)
  VALUES (p_doc_type, p_prefix, 1, p_year)
  ON CONFLICT (doc_type) 
  DO UPDATE SET last_seq = last_seq + 1, updated_at = now()
  RETURNING last_seq INTO v_seq;
  
  RETURN p_prefix || '-' || p_year || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ SECURITY DEFINER;

-- ============================================================================
-- PART 7: SEED INITIAL DATA
-- ============================================================================

-- Populate Permissions Catalog
DELETE FROM public.permissions_catalog;

INSERT INTO public.permissions_catalog (key, label, module) VALUES
-- Dashboard
('view_dashboard', 'Voir Tableau de bord', 'Dashboard'),

-- Cash Management
('view_caisse', 'Voir Caisse', 'Caisse'),
('create_cash_count', 'Créer Comptage', 'Caisse'),
('edit_cash_count', 'Modifier Comptage', 'Caisse'),

-- Transactions
('view_transactions', 'Voir Transactions', 'Transactions'),
('create_transaction', 'Créer Transactions', 'Transactions'),
('edit_transaction', 'Modifier Transactions', 'Transactions'),
('delete_transaction', 'Supprimer Transactions', 'Transactions'),
('validate_transaction', 'Valider Transactions', 'Transactions'),

-- Bank
('view_bank', 'Voir Banque', 'Bank'),
('view_transfer', 'Voir Transferts', 'Bank'),
('create_transfer', 'Créer Transferts', 'Bank'),

-- Sales
('view_sales', 'Voir Ventes', 'Sales'),
('create_vente', 'Créer Ventes', 'Sales'),
('edit_vente', 'Modifier Ventes', 'Sales'),
('print_vente', 'Imprimer Ventes', 'Sales'),

-- Purchases
('view_purchases', 'Voir Achats', 'Purchases'),
('create_achat', 'Créer Achats', 'Purchases'),
('edit_achat', 'Modifier Achats', 'Purchases'),
('pay_debts', 'Régler Dettes', 'Purchases'),

-- Purchase Orders
('view_bon_commande', 'Voir Bons de Commande', 'Bon_Commande'),
('create_bon_commande', 'Créer Bons de Commande', 'Bon_Commande'),
('edit_bon_commande', 'Modifier Bons de Commande', 'Bon_Commande'),

-- Delivery Notes
('view_bon_livraison', 'Voir Bons de Livraison', 'Bon_Livraison'),
('create_bon_livraison', 'Créer Bons de Livraison', 'Bon_Livraison'),
('edit_bon_livraison', 'Modifier Bons de Livraison', 'Bon_Livraison'),

-- Reception Notes
('view_bon_reception', 'Voir Bons de Réception', 'Bon_Reception'),
('create_bon_reception', 'Créer Bons de Réception', 'Bon_Reception'),
('edit_bon_reception', 'Modifier Bons de Réception', 'Bon_Reception'),

-- Proforma Invoices
('view_facture_proformat', 'Voir Factures Proformat', 'Facture_Proformat'),
('create_facture_proformat', 'Créer Factures Proformat', 'Facture_Proformat'),
('edit_facture_proformat', 'Modifier Factures Proformat', 'Facture_Proformat'),

-- Clients
('view_clients', 'Gérer Clients', 'Clients'),
('create_client', 'Créer Clients', 'Clients'),
('edit_client', 'Modifier Clients', 'Clients'),
('delete_client', 'Supprimer Clients', 'Clients'),
('view_client_debts', 'Voir Dettes Clients', 'Clients'),

-- Suppliers
('view_suppliers', 'Gérer Fournisseurs', 'Suppliers'),
('create_supplier', 'Créer Fournisseurs', 'Suppliers'),
('edit_supplier', 'Modifier Fournisseurs', 'Suppliers'),
('delete_supplier', 'Supprimer Fournisseurs', 'Suppliers'),

-- Products
('view_products', 'Voir Produits', 'Products'),
('create_product', 'Créer Produits', 'Products'),
('edit_product', 'Modifier Produits', 'Products'),
('delete_product', 'Supprimer Produits', 'Products'),

-- Inventory
('view_inventory', 'Voir Inventaires', 'Inventory'),
('create_inventory', 'Créer Inventaires', 'Inventory'),
('validate_inventory', 'Valider Inventaires', 'Inventory'),

-- Production
('view_production', 'Voir Production', 'Production'),
('create_production', 'Créer Production', 'Production'),
('edit_production', 'Modifier Production', 'Production'),

-- Reports
('view_reports', 'Voir Rapports', 'Reports'),
('export_reports', 'Exporter Rapports', 'Reports'),

-- Settings
('view_settings', 'Voir Paramètres', 'Settings'),
('edit_settings', 'Modifier Paramètres', 'Settings'),

-- Users Management
('view_users', 'Voir Utilisateurs', 'Users'),
('create_user', 'Créer Utilisateurs', 'Users'),
('edit_user', 'Modifier Utilisateurs', 'Users'),
('delete_user', 'Supprimer Utilisateurs', 'Users');

-- Initialize Company Settings
INSERT INTO public.company_settings (name, phone, city, validation_threshold, low_cash_alert_threshold)
VALUES ('Entreprise Cash', '', 'Alger', 100000, 10000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 8: STORAGE BUCKETS (SQL-based setup)
-- ============================================================================

-- Create logos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create justificatifs bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justificatifs',
  'justificatifs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create products bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FINAL: VERIFICATION
-- ============================================================================

-- Verify tables are created
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Verify RPC functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('create_worker_account', 'delete_worker_account', 'next_document_number')
ORDER BY routine_name;

-- Verify extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pgcrypto', 'uuid-ossp')
ORDER BY extname;

-- Verify storage buckets
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('logos', 'justificatifs', 'products')
ORDER BY id;

-- Verify permissions catalog
SELECT COUNT(*) as permission_count
FROM public.permissions_catalog;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- 
-- ✅ SETUP COMPLETE!
--
-- Your Supabase project is now fully configured with:
-- ✓ All database tables
-- ✓ User management system
-- ✓ Permissions framework
-- ✓ RPC functions for account creation/deletion
-- ✓ Document management (Sales, Purchases, Orders, etc.)
-- ✓ Financial tracking (Invoices, Debts, Payments)
-- ✓ Inventory management
-- ✓ Storage buckets for files
--
-- Next steps:
-- 1. Enable Row Level Security (RLS) if needed
-- 2. Configure storage bucket access policies
-- 3. Update frontend .env with new Supabase credentials
-- 4. Test user creation via Utilisateurs page
--
-- ============================================================================
