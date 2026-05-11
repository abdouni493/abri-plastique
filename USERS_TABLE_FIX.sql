-- ============================================================================
-- USERS TABLE FIX - Authentication & Interface Setup
-- ============================================================================
-- This SQL fixes the users table for proper authentication and adds support
-- for user permissions and interface access management.
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING ENUMS AND RECREATE
-- ============================================================================
-- This safely drops and recreates the enums with CASCADE to handle dependencies
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- ============================================================================
-- 2. CREATE ENUMS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'worker');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- ============================================================================
-- 3. RECREATE USERS TABLE WITH PROPER STRUCTURE
-- ============================================================================
-- First, back up existing data:
-- SELECT * INTO users_backup FROM public.users;

-- Drop and recreate:
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text UNIQUE,
  phone text,
  role user_role NOT NULL DEFAULT 'worker'::user_role,
  status user_status NOT NULL DEFAULT 'active'::user_status,
  password_hash text,
  auth_user_id uuid UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_check CHECK (email IS NOT NULL AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- ============================================================================
-- 4. CREATE USER_PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_unique UNIQUE(user_id, permission_key)
);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Users Table Policies
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything on users" ON public.users;

CREATE POLICY "Users can read their own record"
ON public.users FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Service role can do anything on users"
ON public.users
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- User Permissions Table Policies
DROP POLICY IF EXISTS "Users can read their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Service role can do anything on permissions" ON public.user_permissions;

CREATE POLICY "Users can read their own permissions"
ON public.user_permissions FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can do anything on permissions"
ON public.user_permissions
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_key ON public.user_permissions(permission_key);

-- ============================================================================
-- 8. CREATE PERMISSIONS CATALOG TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.permissions_catalog CASCADE;

CREATE TABLE public.permissions_catalog (
  key text NOT NULL PRIMARY KEY,
  label text NOT NULL,
  module text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- 9. INSERT DEFAULT PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions_catalog (key, label, module) VALUES
-- Dashboard
('view_dashboard', 'Voir Tableau de bord', 'dashboard'),

-- Cash Management
('view_caisse', 'Voir Caisse', 'caisse'),
('create_cash_count', 'Créer Comptage', 'caisse'),
('edit_cash_count', 'Modifier Comptage', 'caisse'),

-- Transactions
('view_transactions', 'Voir Transactions', 'transactions'),
('create_transaction', 'Créer Transactions', 'transactions'),
('edit_transaction', 'Modifier Transactions', 'transactions'),
('delete_transaction', 'Supprimer Transactions', 'transactions'),
('validate_transaction', 'Valider Transactions', 'transactions'),

-- Bank
('view_bank', 'Voir Banque', 'bank'),
('view_transfer', 'Voir Transferts', 'bank'),
('create_transfer', 'Créer Transferts', 'bank'),

-- Sales
('view_sales', 'Voir Ventes', 'sales'),
('create_vente', 'Créer Ventes', 'sales'),
('edit_vente', 'Modifier Ventes', 'sales'),
('print_vente', 'Imprimer Ventes', 'sales'),

-- Purchases
('view_purchases', 'Voir Achats', 'purchases'),
('create_achat', 'Créer Achats', 'purchases'),
('edit_achat', 'Modifier Achats', 'purchases'),
('pay_debts', 'Régler Dettes', 'purchases'),

-- Purchase Orders (Bon de Commande)
('view_bon_commande', 'Voir Bons de Commande', 'bon_commande'),
('create_bon_commande', 'Créer Bons de Commande', 'bon_commande'),
('edit_bon_commande', 'Modifier Bons de Commande', 'bon_commande'),

-- Delivery Notes (Bon de Livraison)
('view_bon_livraison', 'Voir Bons de Livraison', 'bon_livraison'),
('create_bon_livraison', 'Créer Bons de Livraison', 'bon_livraison'),
('edit_bon_livraison', 'Modifier Bons de Livraison', 'bon_livraison'),

-- Reception Notes (Bon de Réception)
('view_bon_reception', 'Voir Bons de Réception', 'bon_reception'),
('create_bon_reception', 'Créer Bons de Réception', 'bon_reception'),
('edit_bon_reception', 'Modifier Bons de Réception', 'bon_reception'),

-- Clients
('view_clients', 'Gérer Clients', 'clients'),
('create_client', 'Créer Clients', 'clients'),
('edit_client', 'Modifier Clients', 'clients'),
('delete_client', 'Supprimer Clients', 'clients'),
('view_client_debts', 'Voir Dettes Clients', 'clients'),

-- Suppliers
('view_suppliers', 'Gérer Fournisseurs', 'suppliers'),
('create_supplier', 'Créer Fournisseurs', 'suppliers'),
('edit_supplier', 'Modifier Fournisseurs', 'suppliers'),
('delete_supplier', 'Supprimer Fournisseurs', 'suppliers'),

-- Products
('view_products', 'Voir Produits', 'products'),
('create_product', 'Créer Produits', 'products'),
('edit_product', 'Modifier Produits', 'products'),
('delete_product', 'Supprimer Produits', 'products'),

-- Inventory
('view_inventory', 'Voir Inventaires', 'inventory'),
('create_inventory', 'Créer Inventaires', 'inventory'),
('validate_inventory', 'Valider Inventaires', 'inventory'),

-- Reports
('view_reports', 'Voir Rapports', 'reports'),
('export_reports', 'Exporter Rapports', 'reports'),

-- Settings
('view_settings', 'Voir Paramètres', 'settings'),
('edit_settings', 'Modifier Paramètres', 'settings'),

-- Users Management
('view_users', 'Voir Utilisateurs', 'users'),
('create_user', 'Créer Utilisateurs', 'users'),
('edit_user', 'Modifier Utilisateurs', 'users'),
('delete_user', 'Supprimer Utilisateurs', 'users'),
('manage_permissions', 'Gérer Permissions', 'users');

-- ============================================================================
-- 10. INSERT ADMIN USER
-- ============================================================================
-- This admin user will be linked to your Supabase Auth user
-- Replace '47bc3611-fd76-4b14-a619-7c510e612ecb' with your actual UID
INSERT INTO public.users (
  id,
  name,
  username,
  email,
  role,
  status,
  auth_user_id
) VALUES (
  uuid_generate_v4(),
  'Admin User',
  'admin',
  'admin@admin.com',
  'admin'::user_role,
  'active'::user_status,
  '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin'::user_role,
  auth_user_id = '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid,
  updated_at = now();

-- ============================================================================
-- 11. GRANT ALL PERMISSIONS TO ADMIN USER
-- ============================================================================
-- Get the admin user ID and insert all permissions
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  u.id,
  pc.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com'
  AND u.role = 'admin'
ON CONFLICT (user_id, permission_key) DO UPDATE SET
  granted = true,
  created_at = now();

-- ============================================================================
-- 12. VERIFICATION QUERIES
-- ============================================================================
-- Verify tables were created:
-- SELECT * FROM public.users;
-- SELECT * FROM public.user_permissions;
-- SELECT * FROM public.permissions_catalog;

-- Verify admin user:
-- SELECT u.*, COUNT(up.id) as permission_count 
-- FROM public.users u
-- LEFT JOIN public.user_permissions up ON u.id = up.user_id
-- WHERE u.email = 'admin@admin.com'
-- GROUP BY u.id;

-- ============================================================================
-- 13. SUMMARY
-- ============================================================================
-- ✅ Users table recreated with proper enums and structure
-- ✅ User permissions table created for interface access control
-- ✅ Permissions catalog created with predefined permissions
-- ✅ RLS policies configured for authentication
-- ✅ Indexes created for performance
-- ✅ Admin user inserted with all permissions granted
-- 
-- NOTE: Make sure the auth_user_id matches your Supabase Auth user UUID
-- ============================================================================
