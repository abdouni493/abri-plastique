# 🚀 ENTREPRISE CASH - COMPLETE SETUP GUIDE FOR NEW SUPABASE PROJECT

## Overview

This guide provides complete instructions for setting up the Entreprise Cash application on a new Supabase project. The application is a comprehensive ERP/accounting system for Algerian SMEs with support for sales, purchases, inventory, and financial management.

---

## 📋 Prerequisites

1. A new Supabase project (already created)
2. Supabase URL and Anon Key
3. SQL Editor access in Supabase Dashboard
4. Database credentials (postgres role)

---

## 🔧 Setup Instructions

### Step 1: Prepare SQL Script

The complete SQL setup script is in: **`COMPLETE_APPLICATION_SETUP.sql`**

This single file contains:
- ✅ Extensions (pgcrypto, uuid-ossp)
- ✅ Custom types and enums
- ✅ All 50+ database tables
- ✅ Indexes for performance
- ✅ Triggers and functions
- ✅ RPC functions (create_worker_account, delete_worker_account, etc.)
- ✅ Permissions catalog seeding
- ✅ Storage bucket configuration
- ✅ Initial data

### Step 2: Execute in Supabase

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **New Query**
3. Open the file: `COMPLETE_APPLICATION_SETUP.sql`
4. Copy **ENTIRE** content
5. Paste into the SQL Editor
6. Click **Execute** button
7. Wait for completion (should take 1-2 minutes)
8. Check output for verification messages

### Step 3: Verify Setup

After execution completes, you should see verification queries showing:

```
✓ Table count: 40+ tables created
✓ RPC functions: 3 functions created
✓ Extensions: pgcrypto, uuid-ossp enabled
✓ Storage buckets: 3 buckets created (logos, justificatifs, products)
✓ Permissions catalog: 50+ permissions seeded
```

---

## 📊 Database Schema Overview

### Core Tables

#### Authentication & Users
- **auth.users** - Supabase native authentication
- **auth.identities** - Email identity records
- **public.profiles** - User profile sync
- **public.users** - Application user records
- **public.user_permissions** - Permission assignments
- **public.permissions_catalog** - All available permissions

#### Financial Management
- **public.transactions** - Cash/bank transactions
- **public.banks** - Bank accounts
- **public.cash_divisions** - Cash distribution

#### Sales & Clients
- **public.ventes** - Sales invoices
- **public.vente_lines** - Sales line items
- **public.clients** - Customer records
- **public.client_debts** - Customer payment tracking

#### Purchases & Suppliers
- **public.achats** - Purchase invoices
- **public.achat_lines** - Purchase line items
- **public.suppliers** - Supplier records
- **public.debts** - Supplier payment tracking
- **public.debt_payments** - Payment history

#### Document Management
- **public.bons_commande** - Purchase orders
- **public.bon_commande_lines** - PO line items
- **public.bons_livraison** - Delivery notes
- **public.bon_livraison_lines** - Delivery line items
- **public.bons_reception** - Reception notes
- **public.bon_reception_lines** - Reception line items
- **public.factures_proformat** - Proforma invoices
- **public.facture_proformat_lines** - Proforma line items

#### Inventory & Products
- **public.products** - Product catalog
- **public.inventaires** - Inventory counts
- **public.inventaire_lines** - Inventory line items

#### Other
- **public.appointments** - Meetings/reminders
- **public.company_settings** - Business configuration
- **public.productions** - Production records
- **public.production_items** - Production details
- **public.document_sequences** - Document numbering

---

## 🔐 Storage Buckets

Three storage buckets are automatically created:

| Bucket | Type | Purpose | Size Limit |
|--------|------|---------|-----------|
| **logos** | Public | Company logos, images | 5 MB |
| **justificatifs** | Private | Support documents, receipts | 10 MB |
| **products** | Public | Product images | 5 MB |

### Access Control

- **logos**: Publicly readable, authenticated users can upload
- **justificatifs**: Authenticated users only (private)
- **products**: Publicly readable, authenticated users can upload

---

## 🔑 Key Features

### User Management
- ✅ Admin and Worker roles
- ✅ Atomic account creation (auth + profile)
- ✅ Permission-based access control
- ✅ Secure password hashing (bcrypt)

### RPC Functions

#### `create_worker_account()`
```sql
SELECT public.create_worker_account(
  'user@example.com',
  'SecurePassword123',
  'John Doe',
  'john_doe',
  '+212612345678',
  'worker'
);
```
- Creates auth user + public profile atomically
- Assigns appropriate permissions
- Returns success/failure with user IDs

#### `delete_worker_account()`
```sql
SELECT public.delete_worker_account('user-id-uuid');
```
- Deletes from both auth.users and public.users
- Cascades to all related records

#### `next_document_number()`
```sql
SELECT public.next_document_number('VENTE', 'V', 2024);
-- Returns: V-2024-000001
```
- Generates sequential document numbers
- Tracks per document type and year

### Permissions System

The system includes 50+ granular permissions:

- **Dashboard**: view_dashboard
- **Caisse**: view_caisse, create_cash_count, edit_cash_count
- **Transactions**: view, create, edit, delete, validate
- **Bank**: view_bank, view_transfer, create_transfer
- **Sales**: view_sales, create_vente, edit_vente, print_vente
- **Purchases**: view_purchases, create_achat, edit_achat, pay_debts
- **Bons**: view/create/edit for bon_commande, bon_livraison, bon_reception
- **Invoices**: view/create/edit factures_proformat
- **Clients**: view, create, edit, delete, view_client_debts
- **Suppliers**: view, create, edit, delete
- **Products**: view, create, edit, delete
- **Inventory**: view, create, validate
- **Production**: view, create, edit
- **Reports**: view, export
- **Settings**: view, edit
- **Users**: view, create, edit, delete

### Admin vs Worker

- **Admin**: Gets ALL permissions automatically
- **Worker**: Gets limited permissions (dashboard, caisse, basic transactions, reports)

---

## 📱 Frontend Configuration

### Update `.env` file

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Test Connection

1. Start frontend: `npm run dev`
2. Go to login page
3. Create new account via signup tab
4. Login should work immediately
5. Check Utilisateurs page to verify user creation

---

## ✅ Verification Checklist

After setup, verify these items:

- [ ] SQL script executed without errors
- [ ] 40+ tables visible in Supabase > Tables
- [ ] 3 storage buckets created (logos, justificatifs, products)
- [ ] 50+ permissions in permissions_catalog
- [ ] RPC functions visible in Functions list
- [ ] Can create new user via API
- [ ] Frontend .env updated with new credentials
- [ ] Frontend can connect to database
- [ ] User signup works
- [ ] User login works
- [ ] Utilisateurs page shows created users
- [ ] Permissions can be assigned

---

## 🚨 Troubleshooting

### Error: "Extension pgcrypto not found"
**Solution**: Run SQL again, it should create it with `CREATE EXTENSION IF NOT EXISTS`

### Error: "Duplicate table/type"
**Solution**: Normal, script uses `IF NOT EXISTS` clauses. Safe to re-run.

### Error: "Foreign key constraint failed"
**Solution**: Ensure all referenced tables exist. Run full script in order.

### Buckets not visible in Storage
**Solution**: Refresh Supabase dashboard. Buckets created via SQL take a moment to appear.

### User signup fails
**Solution**: 
1. Check auth.users has the account
2. Check public.users has profile
3. Verify auth_user_id foreign key is set
4. Check frontend .env has correct credentials

### Login fails with "Database error"
**Solution**: This usually means identities table missing entry. Run script again to rebuild identities.

---

## 📊 Database Relationships

```
auth.users ↔ public.users ← public.user_permissions → public.permissions_catalog
    ↓
 auth.identities

public.transactions ← public.banks
                    ← public.clients
                    ← public.suppliers

public.clients ← public.ventes ← public.vente_lines ← public.products
               ← public.appointments
               ← public.client_debts ← public.client_debt_payments

public.suppliers ← public.achats ← public.achat_lines ← public.products
                 ← public.bons_commande ← public.bon_commande_lines
                 ← public.debts ← public.debt_payments
                 ← public.appointments

public.products ← public.bons_livraison, public.bons_reception
                ← public.factures_proformat, public.vente_lines, public.achat_lines
                ← public.inventaire_lines
                ← public.production_items

public.company_settings (singleton config)
```

---

## 🔄 Data Flow Examples

### Creating a Worker User

```typescript
// Frontend calls RPC
const { data, error } = await supabase.rpc('create_worker_account', {
  p_email: 'worker@example.com',
  p_password: 'SecurePass123',
  p_name: 'John Worker',
  p_username: 'john_worker',
  p_phone: '+212612345678',
  p_role: 'worker'
});

// Backend:
// 1. Validates input
// 2. Creates auth.users with bcrypt password
// 3. Creates auth.identities (for login)
// 4. Creates public.users profile
// 5. Grants 12 default permissions from catalog
// 6. Returns user IDs on success
```

### Creating a Sales Invoice

```typescript
// 1. Create vente record
const { data: vente } = await supabase.from('ventes').insert({
  numero: 'V-2024-000001',  // Generated by next_document_number()
  date: '2024-05-10',
  client_id: 'client-uuid',
  total_ht: 1000,
  total_tva: 190,
  total_ttc: 1190,
  montant_paye: 0,
  status: 'brouillon'
});

// 2. Create line items
await supabase.from('vente_lines').insert([
  { vente_id, product_id, quantity: 2, prix_unit_ht: 500, tva: 19, ... },
  { vente_id, product_id, quantity: 1, prix_unit_ht: 1000, tva: 19, ... }
]);

// 3. Update client totals automatically
// Triggers handle calculation
```

---

## 📈 Performance Indexes

Indexes are automatically created on:
- users: auth_user_id, email, username
- user_permissions: user_id, permission_key
- transactions: bank_id, client_id, supplier_id, date
- ventes: client_id, numero
- achats: supplier_id, numero

These ensure fast queries for:
- User lookups
- Permission checks
- Transaction filtering
- Invoice searches

---

## 🔒 Security Notes

- ✅ Passwords hashed with bcrypt (not stored in plaintext)
- ✅ RPC functions use SECURITY DEFINER (runs as postgres)
- ✅ Foreign keys prevent orphaned records
- ✅ Unique constraints prevent duplicates
- ✅ Email format validation
- ✅ Role-based access (admin vs worker)

---

## 📞 Support

If you encounter issues:

1. Check SQL execution output for error messages
2. Verify all tables in Supabase > Tables
3. Test RPC functions in SQL Editor
4. Check browser console for frontend errors
5. Review Supabase logs for backend errors

---

## 📝 Notes

- The script is idempotent (safe to run multiple times)
- All tables created with CASCADE delete for referential integrity
- Timestamps automatically managed with triggers
- Document numbering system scales to millions of documents
- Permissions system is extensible (add new permissions to catalog anytime)

---

**Setup Complete! Your Entreprise Cash application is ready to go! 🎉**
