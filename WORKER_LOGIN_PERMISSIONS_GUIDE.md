/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * WORKER LOGIN & PERMISSIONS TESTING GUIDE
 * 
 * This guide explains how to:
 * 1. Create test worker accounts with proper auth credentials
 * 2. Test that workers only see interfaces they have permission for
 * 3. Test that workers only see action buttons they have permission for
 */

# Worker Login & Permissions System

## Step 1: Create Test Accounts in Supabase

### Run This SQL
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste **CREATE_TEST_ACCOUNTS.sql** (entire file)
4. Click **"Run"**

You should see:
```
Admin Account Created:
...

Worker Account Created:
...

Permissions Summary:
...
```

---

## Step 2: Test Credentials

After running the SQL, you can log in with:

### Admin Account
- **Email**: admin@admin.com
- **Password**: admin123
- **Permissions**: All interfaces & all actions
- **Modes**: Both Caisse and Commercial

### Worker Account
- **Email**: worker@test.com
- **Password**: worker123
- **Permissions**: Limited to Caisse mode only
- **Modes**: Only Caisse (Cash management)

---

## Step 3: Test Interface Filtering

### Login as Worker
1. Logout from admin account
2. Login with `worker@test.com` / `worker123`
3. **Expected**: In the sidebar, you should see:
   - ✅ Dashboard
   - ✅ Caisse
   - ✅ Banque (Bank)
   - ✅ Transfert (Transfers)
   - ✅ Ventes (Sales)
   - ✅ Achats (Purchases)
   - ✅ Clients
   - ✅ Fournisseurs
   - ✅ Utilisateurs
   - ✅ Rapports
   - ✅ Paramètres

### Hidden for Worker (Commercial Mode)
- ❌ Dashboard Commercial (should NOT be visible)
- ❌ Stockage (should NOT be visible)
- ❌ Production (should NOT be visible)
- ❌ Bon de Commande (should NOT be visible)
- ❌ Bon de Livraison (should NOT be visible)
- ❌ Bon de Réception (should NOT be visible)
- ❌ Facture Proformat (should NOT be visible)
- ❌ Inventaire (should NOT be visible)

---

## Step 4: Test Action Button Permissions

The action buttons in pages like Clients, Fournisseurs, Achats, and Ventes should show/hide based on worker permissions.

### How Action Buttons Work

Each action requires a specific permission:
- **Create (➕)** → `create_*` permission
- **View Details (👁️)** → `view_*` permission
- **Edit (✏️)** → `edit_*` permission
- **Delete (🗑️)** → `delete_*` permission
- **Print (🖨️)** → `print_*` permission

### Example: Clients Page

**When logged in as worker:**
1. Go to **Clients** page
2. Look at the action buttons on each client row:
   - ✅ View Details button should appear (view permission)
   - ❌ Edit button may be hidden (if edit permission not granted)
   - ❌ Delete button may be hidden (if delete permission not granted)
   - ❌ Print button may be hidden (if print permission not granted)

---

## Step 5: Customize Worker Permissions

To give the worker more permissions:

### Option 1: Via Admin Interface
1. **Login as admin** (admin@admin.com / admin123)
2. Go to **Utilisateurs** page
3. Find **Worker Test** user
4. Click the **Shield icon (🛡️)**
5. Select **"Mode Caisse"** (already selected)
6. Click **"Accès Interfaces"** tab
7. Toggle on any additional interfaces
8. Click **"Permissions d'Actions"** tab
9. Toggle on desired actions
10. Click **"Enregistrer les permissions"**

### Option 2: Via SQL (Advanced)
Run this to add "edit" permission for worker:
```sql
INSERT INTO public.user_permissions (user_id, permission_key, granted)
SELECT 
  u.id,
  'edit_client',
  true
FROM public.users u
WHERE u.email = 'worker@test.com'
ON CONFLICT DO NOTHING;
```

---

## Step 6: How It Works Behind the Scenes

### Interface Filtering (Sidebar.tsx)
```tsx
const menuItems = mode === 'caisse' ? caisseMenuItems : commercialMenuItems;
const filteredItems = menuItems.filter(item => hasPermission(item.permission));
```

- Only shows menu items where `hasPermission(permission)` returns true
- Worker can only see Caisse mode items
- Admin sees both Caisse and Commercial items

### Action Button Filtering (in page components)
```tsx
// Example: Show Edit button only if user has permission
{hasPermission('edit_client') && (
  <button onClick={() => editClient(client.id)}>
    <Edit size={18} />
  </button>
)}
```

- Each action button checks permission before rendering
- Worker sees fewer buttons if they don't have those permissions

### Permission Check (AuthContext.tsx)
```tsx
const hasPermission = useCallback((permission: string): boolean => {
  if (state.status === 'authenticated' && !state.user) return true;
  if (!state.user) return false;
  return state.user.user_permissions.some(
    p => p.permission_key === permission && p.granted
  );
}, [state.user, state.status]);
```

- Checks if user has the specific permission in database
- Returns true only if permission exists AND granted = true

---

## Test Checklist

### ✅ Authentication
- [ ] Admin can login with admin@admin.com / admin123
- [ ] Worker can login with worker@test.com / worker123
- [ ] Logout works for both
- [ ] Session persists on page refresh

### ✅ Interface Visibility
- [ ] Worker sees only Caisse mode interfaces
- [ ] Worker CANNOT see Commercial mode interfaces
- [ ] Sidebar menu filters correctly
- [ ] Clicking hidden routes redirects or shows error

### ✅ Action Buttons
- [ ] Worker sees allowed action buttons
- [ ] Worker does NOT see forbidden action buttons
- [ ] Admin sees all action buttons
- [ ] Buttons are disabled/hidden based on permissions

### ✅ Permissions Management
- [ ] Admin can open worker permissions modal
- [ ] Mode checkboxes work (Caisse/Commercial)
- [ ] Interface list updates when mode changes
- [ ] Action tab shows all possible actions
- [ ] Save button updates permissions in database

### ✅ Permission Changes Take Effect
- [ ] After admin grants new permission to worker
- [ ] Worker's interface updates immediately (after logout/login)
- [ ] New menu items appear
- [ ] New action buttons appear

---

## Troubleshooting

### Issue: Worker Can't Login
**Solution**: 
- Run CREATE_TEST_ACCOUNTS.sql again
- Make sure email is correct: worker@test.com
- Make sure password is correct: worker123
- Check that auth.users table has the user

### Issue: Worker Sees All Interfaces (No Filtering)
**Solution**:
- Check that RLS is disabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'user_permissions'`
- Should return: false (RLS disabled) ✅
- If true, run REMOVE_ALL_RLS.sql again

### Issue: Worker Sees Commercial Mode
**Solution**:
- Go to Utilisateurs page (as admin)
- Open worker permissions
- Uncheck "🏢 Commercial" mode
- Save permissions
- Worker logs out and back in

### Issue: Action Buttons Don't Filter
**Solution**:
- Check page component has permission checks like:
  ```tsx
  {hasPermission('edit_client') && <EditButton />}
  ```
- If missing, buttons need to be updated in that page component
- Contact developer to add permission filtering

---

## Implementation Status

### ✅ Completed
- RLS policies disabled on all tables
- Sidebar filtering implemented (hasPermission checks)
- Permissions modal for managing access
- Mode-based interface system (Caisse vs Commercial)
- Test accounts created with different permission levels

### 🔄 In Progress
- Action button permission filtering in page components
- Some pages may need permission checks added for buttons

### 📋 To Do
- Add `{hasPermission('...')}` guards to action buttons in:
  - Clients.tsx (View, Edit, Delete, Print buttons)
  - Fournisseurs.tsx (View, Edit, Delete buttons)
  - Achats.tsx (View, Edit, Delete buttons)
  - Ventes.tsx (View, Edit, Delete buttons)
  - And other pages with action buttons

---

## Example: Adding Permission Check to Action Button

If a page is missing permission filtering for action buttons, here's how to add it:

**Before** (shows button to everyone):
```tsx
<button onClick={() => editClient(client.id)}>
  <Edit size={18} />
</button>
```

**After** (shows button only to authorized users):
```tsx
{hasPermission('edit_client') && (
  <button onClick={() => editClient(client.id)}>
    <Edit size={18} />
  </button>
)}
```

Or with disabled state:
```tsx
<button 
  onClick={() => editClient(client.id)}
  disabled={!hasPermission('edit_client')}
  className={hasPermission('edit_client') ? '' : 'opacity-50 cursor-not-allowed'}
>
  <Edit size={18} />
</button>
```
