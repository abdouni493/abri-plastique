# 🔐 Users Table Fix & Admin User Setup Guide

## Overview
This guide explains how to fix your `users` table for proper authentication and permissions management, and how to insert your admin user.

---

## 📋 What's Being Fixed

### Current Issues:
- ❌ No proper ENUM types for `user_role` and `user_status`
- ❌ No `user_permissions` table for granular access control
- ❌ Missing indexes for authentication performance
- ❌ No RLS policies for security
- ❌ No permissions catalog for interface management

### After This Fix:
- ✅ User roles: `admin` | `worker`
- ✅ User statuses: `active` | `inactive` | `suspended`
- ✅ Full permissions system with 50+ predefined permissions
- ✅ RLS policies for authentication security
- ✅ Optimized indexes for fast lookups
- ✅ Admin user created with all permissions

---

## 🚀 Quick Setup (2 Steps)

### Step 1: Run the Main Fix Script
In your Supabase SQL Editor, copy and run:
**File:** `USERS_TABLE_FIX.sql`

This will:
- Create the `user_role` and `user_status` ENUM types
- Recreate the `users` table with proper structure
- Create the `user_permissions` table
- Create the `permissions_catalog` table
- Insert 50+ predefined permissions
- Add your admin user
- Enable RLS with security policies
- Create performance indexes

**⏱️ Execution Time:** ~5-10 seconds

### Step 2: Verify the Setup
Run the verification queries at the bottom of the SQL file to confirm everything worked.

---

## 👤 Admin User Details

### Your Admin User:
```
Email:     admin@admin.com
Username:  admin
Name:      Admin User
Role:      admin
Status:    active
Auth UID:  47bc3611-fd76-4b14-a619-7c510e612ecb
Permissions: ALL (50+ permissions granted)
```

---

## 📊 Database Schema

### users table
```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text UNIQUE,
  phone text,
  role user_role NOT NULL DEFAULT 'worker',
  status user_status NOT NULL DEFAULT 'active',
  password_hash text,
  auth_user_id uuid UNIQUE,  -- Links to Supabase Auth
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)
```

### user_permissions table
```sql
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, permission_key)
)
```

### permissions_catalog table
```sql
CREATE TABLE public.permissions_catalog (
  key text PRIMARY KEY,
  label text NOT NULL,
  module text NOT NULL,
  created_at timestamp DEFAULT now()
)
```

---

## 🔑 Predefined Permissions (50+)

### Dashboard
- `view_dashboard` - Voir Tableau de bord

### Cash Management
- `view_caisse` - Voir Caisse
- `create_cash_count` - Créer Comptage
- `edit_cash_count` - Modifier Comptage

### Transactions
- `view_transactions` - Voir Transactions
- `create_transaction` - Créer Transactions
- `edit_transaction` - Modifier Transactions
- `delete_transaction` - Supprimer Transactions
- `validate_transaction` - Valider Transactions

### Bank
- `view_bank` - Voir Banque
- `view_transfer` - Voir Transferts
- `create_transfer` - Créer Transferts

### Sales (Ventes)
- `view_sales` - Voir Ventes
- `create_vente` - Créer Ventes
- `edit_vente` - Modifier Ventes
- `print_vente` - Imprimer Ventes

### Purchases (Achats)
- `view_purchases` - Voir Achats
- `create_achat` - Créer Achats
- `edit_achat` - Modifier Achats
- `pay_debts` - Régler Dettes

### Purchase Orders (Bon de Commande)
- `view_bon_commande` - Voir Bons de Commande
- `create_bon_commande` - Créer Bons de Commande
- `edit_bon_commande` - Modifier Bons de Commande

### Delivery Notes (Bon de Livraison)
- `view_bon_livraison` - Voir Bons de Livraison
- `create_bon_livraison` - Créer Bons de Livraison
- `edit_bon_livraison` - Modifier Bons de Livraison

### Reception Notes (Bon de Réception)
- `view_bon_reception` - Voir Bons de Réception
- `create_bon_reception` - Créer Bons de Réception
- `edit_bon_reception` - Modifier Bons de Réception

### Clients
- `view_clients` - Gérer Clients
- `create_client` - Créer Clients
- `edit_client` - Modifier Clients
- `delete_client` - Supprimer Clients
- `view_client_debts` - Voir Dettes Clients

### Suppliers (Fournisseurs)
- `view_suppliers` - Gérer Fournisseurs
- `create_supplier` - Créer Fournisseurs
- `edit_supplier` - Modifier Fournisseurs
- `delete_supplier` - Supprimer Fournisseurs

### Products
- `view_products` - Voir Produits
- `create_product` - Créer Produits
- `edit_product` - Modifier Produits
- `delete_product` - Supprimer Produits

### Inventory (Inventaires)
- `view_inventory` - Voir Inventaires
- `create_inventory` - Créer Inventaires
- `validate_inventory` - Valider Inventaires

### Reports (Rapports)
- `view_reports` - Voir Rapports
- `export_reports` - Exporter Rapports

### Settings (Paramètres)
- `view_settings` - Voir Paramètres
- `edit_settings` - Modifier Paramètres

### User Management
- `view_users` - Voir Utilisateurs
- `create_user` - Créer Utilisateurs
- `edit_user` - Modifier Utilisateurs
- `delete_user` - Supprimer Utilisateurs
- `manage_permissions` - Gérer Permissions

---

## 🔒 Security: Row Level Security (RLS)

### Policies Created:

**1. Users Table:**
- ✅ Users can read their own record (via `auth_user_id`)
- ✅ Service role (admin) can do everything

**2. User Permissions Table:**
- ✅ Users can read their own permissions
- ✅ Service role can do everything

### How It Works:
1. User logs in → Supabase Auth generates session
2. `auth.uid()` is automatically available in SQL
3. User can only see their own data (if `auth_user_id` matches)
4. Admins (service role) can access everything

---

## ⚡ Performance Indexes

The following indexes are created for fast lookups:
```sql
idx_users_auth_user_id      -- For login lookups
idx_users_username          -- For username searches
idx_users_email             -- For email lookups
idx_users_role              -- For role filtering
idx_user_permissions_user_id        -- For permission queries
idx_user_permissions_permission_key -- For permission lookups
```

---

## 🧪 Verification Queries

### Check if Admin User Exists:
```sql
SELECT * FROM public.users WHERE email = 'admin@admin.com';
```

### Count Admin Permissions:
```sql
SELECT COUNT(*) as permission_count 
FROM public.user_permissions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'admin@admin.com');
```

### View All Permissions Catalog:
```sql
SELECT * FROM public.permissions_catalog ORDER BY module, label;
```

### View User with Permissions (example):
```sql
SELECT 
  u.id,
  u.name,
  u.username,
  u.email,
  u.role,
  COUNT(up.id) as total_permissions
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.email = 'admin@admin.com'
GROUP BY u.id, u.name, u.username, u.email, u.role;
```

---

## 📝 How to Use (For Your App)

### In TypeScript/Frontend:

#### Check User Permissions:
```typescript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  
  // Check if user has permission
  if (user?.permissions?.['create_product']) {
    // Show create product button
  }
}
```

#### Load User with Permissions:
```typescript
const { data } = await supabase
  .from('users')
  .select('id, name, username, email, role, user_permissions(permission_key, granted)')
  .eq('auth_user_id', userId)
  .single();

// data.user_permissions will be an array of permission objects
```

#### Create New Worker User:
```sql
INSERT INTO public.users (name, username, email, role, auth_user_id)
VALUES ('John Doe', 'john_doe', 'john@example.com', 'worker'::user_role, 'auth-user-uuid');

-- Then grant specific permissions:
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  (SELECT id FROM users WHERE username = 'john_doe'),
  key,
  true
FROM permissions_catalog
WHERE key IN ('view_dashboard', 'view_sales', 'create_transaction');
```

---

## 🛠️ Troubleshooting

### "Auth user not found" error?
- ✅ Make sure `auth_user_id` in the users table matches the UID from `auth.users`
- ✅ Check Supabase Dashboard → Authentication → Users

### "Permission denied" error?
- ✅ Check RLS policies are enabled: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`
- ✅ Verify the user has the `admin` role or appropriate permissions

### Permissions not loading?
- ✅ Check the `user_permissions` table has records
- ✅ Verify the permission_key exists in `permissions_catalog`

### Login failing?
- ✅ Ensure `auth_user_id` is not NULL
- ✅ Verify the email matches between `auth.users` and `public.users`

---

## 📚 Related Files

- [USERS_TABLE_FIX.sql](./USERS_TABLE_FIX.sql) - Complete table fix script
- [INSERT_ADMIN_USER.sql](./INSERT_ADMIN_USER.sql) - Quick admin user insert
- [src/context/AuthContext.tsx](./src/context/AuthContext.tsx) - Authentication logic
- [src/pages/Utilisateurs.tsx](./src/pages/Utilisateurs.tsx) - User management UI

---

## ✅ Checklist

- [ ] Run `USERS_TABLE_FIX.sql` in Supabase SQL Editor
- [ ] Verify no errors in the console
- [ ] Check admin user exists: `SELECT * FROM public.users WHERE email = 'admin@admin.com';`
- [ ] Verify permissions exist: `SELECT COUNT(*) FROM public.permissions_catalog;` (should be 50+)
- [ ] Login with admin@admin.com in the app
- [ ] Check dashboard loads successfully
- [ ] Verify user management interface works

---

## 🎉 Done!

Your users table is now properly configured for:
- ✅ Secure authentication
- ✅ Granular permissions management
- ✅ Role-based access control (RBAC)
- ✅ Worker and admin interfaces
- ✅ Optimized performance

**Happy coding! 🚀**
