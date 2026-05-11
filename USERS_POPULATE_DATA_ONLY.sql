-- ============================================================================
-- USERS TABLE - POPULATE DATA ONLY (Tables Already Exist)
-- ============================================================================
-- Use this version if tables already exist. It only populates data.
-- ============================================================================

-- ============================================================================
-- 1. POPULATE PERMISSIONS CATALOG
-- ============================================================================
DELETE FROM public.permissions_catalog;

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
('manage_permissions', 'Gérer Permissions', 'users')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. INSERT ADMIN USER
-- ============================================================================
INSERT INTO public.users (
  name,
  username,
  email,
  phone,
  role,
  status,
  auth_user_id
) VALUES (
  'Admin User',
  'admin',
  'admin@admin.com',
  NULL,
  'admin'::user_role,
  'active'::user_status,
  '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin'::user_role,
  status = 'active'::user_status,
  auth_user_id = '47bc3611-fd76-4b14-a619-7c510e612ecb'::uuid,
  updated_at = now();

-- ============================================================================
-- 3. GRANT ALL PERMISSIONS TO ADMIN USER
-- ============================================================================
DELETE FROM public.user_permissions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'admin@admin.com');

INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  u.id,
  pc.key,
  true
FROM public.users u
CROSS JOIN public.permissions_catalog pc
WHERE u.email = 'admin@admin.com'
  AND u.role = 'admin'::user_role;

-- ============================================================================
-- 4. VERIFY THE SETUP
-- ============================================================================
SELECT 
  u.id,
  u.name,
  u.username,
  u.email,
  u.role,
  u.status,
  u.auth_user_id,
  COUNT(up.id) as total_permissions
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.email = 'admin@admin.com'
GROUP BY u.id, u.name, u.username, u.email, u.role, u.status, u.auth_user_id;
