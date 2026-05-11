/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * USER CREATION & PERMISSIONS - FIX GUIDE
 * 
 * This document explains how to fix the 403 Forbidden error when creating users
 * and how to properly use the permissions interface.
 */

# Fix User Creation & Permissions Interface

## Issue 1: 403 Forbidden Error - RLS Policy Violation

### Problem
When trying to create a new user in the Utilisateurs page, you get:
```
POST https://atxoupjkwoltgwlbhkih.supabase.co/rest/v1/users 403 (Forbidden)
Error: new row violates row-level security policy for table "users"
```

### Root Cause
The `users` table has Row-Level Security (RLS) enabled, but the policies don't allow authenticated users to insert new rows.

### Solution

#### Step 1: Run the RLS Fix SQL
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `FIX_RLS_USERS_PERMISSIONS.sql` from the project root
4. Copy all the SQL code
5. Paste it into Supabase SQL Editor
6. Click **Run**

This SQL script will:
- ✅ Enable RLS on users and permissions tables
- ✅ Create policies allowing authenticated users to insert users
- ✅ Create policies allowing admins to manage all users
- ✅ Create policies for the permissions tables
- ✅ Populate the permissions_catalog table

#### Step 2: Verify Policies Were Created
After running the SQL, you should see the message:
```
RLS Policies Created Successfully
```

### What the Policies Do

| Policy | Table | Action | Allows |
|--------|-------|--------|--------|
| `users_read_all` | users | SELECT | All authenticated users can view all users |
| `users_insert_authenticated` | users | INSERT | All authenticated users can create users |
| `users_update_own` | users | UPDATE | Users can update only their own profile |
| `users_update_admin` | users | UPDATE | Admins can update any user |
| `users_delete_admin` | users | DELETE | Only admins can delete users |
| `permissions_read_all` | user_permissions | SELECT | All users can read permissions |
| `permissions_manage_admin` | user_permissions | ALL | Only admins can manage permissions |

---

## Issue 2: Permissions Interface Not Working

### Problem
- The permissions checkboxes don't toggle properly
- Permissions don't save when clicking "Enregistrer les permissions"
- Permissions modal doesn't load existing permissions

### Solution

The fix has been implemented in `Utilisateurs.tsx`:

#### What Changed:
1. **Loading Permissions**: When you click the Shield (Permissions) button, the modal now automatically loads the current permissions for that user
2. **Toggling Permissions**: Clicking on any permission item toggles it (checked/unchecked)
3. **Saving Permissions**: Click "Enregistrer les permissions" to save all changes
4. **Two Tabs**: 
   - **Accès Interfaces**: Control which pages/sections the user can access
   - **Permissions d'Actions**: Control what actions they can perform

### How to Use the Permissions Interface

1. **Open User Permissions**
   - Click the Shield icon (🛡️) next to any user in the list
   - The permissions modal opens and automatically loads their current permissions

2. **Switch Between Tabs**
   - Click "Accès Interfaces" to manage page access
   - Click "Permissions d'Actions" to manage action permissions

3. **Toggle Permissions**
   - Click on any permission item to toggle it on/off
   - ✅ Checked = User has this permission
   - ☐ Unchecked = User does not have this permission

4. **Save Changes**
   - Click "Enregistrer les permissions" button at the bottom
   - A success notification confirms the save
   - The permissions modal closes automatically

---

## Testing the Fix

### Test 1: Create a New User
1. Go to **Utilisateurs** page
2. Click "Nouveau Membre" button
3. Fill in the form:
   - Nom Complet: "Test User"
   - Numéro de Téléphone: "+213 555 123456"
   - Nom d'Utilisateur: "testuser"
   - Email: "testuser@example.com"
   - Mot de Passe: "TestPass123!"
   - Poste: Select "Travailleur"
4. Click "Créer l'utilisateur"

**Expected Result**: User is created successfully with no 403 error ✅

### Test 2: Manage User Permissions
1. Go to **Utilisateurs** page
2. Find the user you created ("Test User")
3. Click the Shield icon (🛡️) in the Actions column
4. The permissions modal opens showing all available permissions
5. Click on "Voir Tableau de bord" to toggle it
6. Switch to "Permissions d'Actions" tab
7. Toggle some action permissions
8. Click "Enregistrer les permissions"

**Expected Result**: Permissions save successfully and modal closes ✅

### Test 3: Load Existing Permissions
1. Go to **Utilisateurs** page
2. Click the Shield icon for the user you modified
3. The modal opens and shows your previously saved permissions

**Expected Result**: All previously saved permissions are shown as checked ✅

---

## Available Permissions

### Interfaces (Access Control)
- **Caisse** - Access to Cash/Caisse section
- **Banque** - Access to Bank section
- **Transfert** - Access to Transfers
- **Ventes** - Access to Sales
- **Achats & Dettes** - Access to Purchases & Debts
- **Clients** - Access to Clients section
- **Fournisseurs** - Access to Suppliers
- **Dépenses** - Access to Expenses
- **Utilisateurs** - Access to Users management
- **Rapports** - Access to Reports
- **Paramètres** - Access to Settings

### Actions (Permission Control)
- **Créer** - Create new items
- **Voir Détails** - View item details
- **Modifier** - Edit items
- **Imprimer** - Print documents
- **Supprimer** - Delete items

---

## Troubleshooting

### Still Getting 403 Error?
1. ✅ Verify you ran the SQL script from `FIX_RLS_USERS_PERMISSIONS.sql`
2. ✅ Check that you logged out and back in after the fix
3. ✅ Clear your browser cache
4. ✅ Try in an incognito/private window
5. ✅ Check Supabase Dashboard → Authentication → Policies to verify they were created

### Permissions Not Saving?
1. ✅ Check browser console for error messages (F12 → Console)
2. ✅ Verify RLS policies are in place (see above)
3. ✅ Try refreshing the page and trying again
4. ✅ Make sure you're logged in as an admin user

### Permissions Modal Not Opening?
1. ✅ Click the Shield icon again
2. ✅ Wait a moment for the modal to load
3. ✅ Check console for JavaScript errors (F12 → Console)

---

## Technical Details

### Database Schema Changes
No schema changes needed - the SQL script only modifies RLS policies and inserts data into existing tables.

### Code Changes in Utilisateurs.tsx
1. Added `onAnimationComplete` callback to load permissions when modal opens
2. Updated permission save logic to handle batch delete/insert
3. Added `setUserPermissions({})` when closing modal to clear state

### RLS Policy Logic
The policies use PostgreSQL functions to check user role:
```sql
EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND role = 'admin'
)
```

This ensures only admins can perform sensitive operations.

---

## Next Steps

1. ✅ Run the SQL fix script
2. ✅ Test creating a new user
3. ✅ Test managing permissions
4. ✅ Verify everything works as expected
5. ✅ (Optional) Implement permission checks in frontend pages

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the Supabase logs for detailed error messages
3. Verify RLS policies are in place
4. Check browser console for JavaScript errors
