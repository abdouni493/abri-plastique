/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PERMISSIONS & ACCESS INTERFACE - UPDATE GUIDE
 * 
 * New features and improvements to the Permissions interface in Utilisateurs.tsx
 */

# Permissions & Access Interface - Complete Overhaul

## What Changed

### 1. Mode-Based Access Control 🎯

The permissions interface now supports **two separate access modes**:

#### 📊 Mode Caisse (Cash Management)
Users with this mode get access to:
- Tableau de bord (Dashboard)
- Caisse (Cash Management)
- Banque (Bank)
- Transfert (Transfers)
- Ventes (Sales)
- Achats & Dettes (Purchases & Debts)
- Clients (Clients)
- Fournisseurs (Suppliers)
- Utilisateurs (Users)
- Rapports (Reports)
- Paramètres (Settings)

#### 🏢 Mode Commercial
Users with this mode get access to:
- Caisse (Cash Management)
- Dashboard Commercial
- Stockage (Storage)
- Production
- Achats & Dettes (Purchases & Debts)
- Ventes (Sales)
- Fournisseurs (Suppliers)
- Clients (Clients)
- Bon de Commande (Purchase Orders)
- Bon de Livraison (Delivery Notes)
- Bon de Réception (Reception Notes)
- Facture Proformat (Proforma Invoices)
- Utilisateurs (Users)
- Inventaire (Inventory)
- Rapports (Reports)
- Paramètres (Settings)

### 2. How to Use the New Interface

#### Opening Permissions
1. Go to **Utilisateurs** page
2. Click the **Shield icon (🛡️)** next to any user
3. The Permissions modal opens

#### Step 1: Select Access Mode(s)
At the top of the modal, you'll see two checkboxes:
- ☐ 📊 Mode Caisse
- ☐ 🏢 Commercial

✅ **Check one or both modes** to enable access for that user
❌ **Uncheck a mode** to remove all its interfaces from the user

#### Step 2: Manage Interface Access
1. Click the **"Accès Interfaces"** tab
2. The interface list updates to show only the interfaces for selected modes
3. **Toggle each interface** to grant/deny access

**Example**:
- Check "📊 Mode Caisse" → See cash management interfaces
- Check "🏢 Commercial" → See commercial interfaces
- Check both → See ALL interfaces (with overlaps merged)

#### Step 3: Manage Action Permissions
1. Click the **"Permissions d'Actions"** tab
2. Toggle action permissions:
   - Créer (Create)
   - Voir Détails (View Details)
   - Modifier (Edit)
   - Imprimer (Print)
   - Supprimer (Delete)

#### Step 4: Save All Changes
1. Click **"Enregistrer les permissions"** button
2. All changes are saved to the database

### 3. Design Improvements

#### User Creation Modal
- **Smaller size**: Max-width reduced from 2xl to lg
- **Scrollable**: Long forms now scroll instead of taking up full screen
- **Compact layout**: Better vertical spacing, optimized for smaller screens
- **Streamlined buttons**: Cleaner footer with smaller buttons
- **Max height**: Set to 85vh with overflow-y-auto

**Before**:
```
- Large 2xl modal
- Takes up lot of space
- Information box too verbose
```

**After**:
```
- Compact lg modal
- Vertically scrollable
- Concise information box
- Better mobile experience
```

## Technical Details

### State Management

```tsx
// Mode selection state
const [selectedModes, setSelectedModes] = useState<{ 
  caisse: boolean; 
  commercial: boolean 
}>({ caisse: false, commercial: false });

// Interface definitions
const caisseInterfaces = [...]; // 12 interfaces for caisse mode
const commercialInterfaces = [...]; // 17 interfaces for commercial mode
```

### Auto-Load Modes
When opening the permissions modal:
1. Loads current user permissions from database
2. Analyzes which modes are active
3. Auto-checks the mode checkboxes
4. Displays interfaces for those modes

```tsx
onAnimationComplete={() => {
  // Auto-detect and load modes
  user.user_permissions.forEach((perm) => {
    if (caisseInterfaces.some(i => i.id === perm.permission_key)) {
      modes.caisse = true;
    }
    if (commercialInterfaces.some(i => i.id === perm.permission_key)) {
      modes.commercial = true;
    }
  });
}}
```

### Permission Cleanup
When unchecking a mode:
- All interfaces for that mode are removed from permissions
- User keeps permissions from the other mode(s)

```tsx
if (!e.target.checked) {
  // Remove all commercial permissions
  const newPerms = {...userPermissions};
  commercialInterfaces.forEach(i => delete newPerms[i.id]);
  setUserPermissions(newPerms);
}
```

## Testing the New Features

### Test 1: Create User with Caisse Mode
1. Create a new user
2. Open permissions
3. Check only "📊 Mode Caisse"
4. Select a few caisse interfaces
5. Save
6. **Expected**: User has access only to caisse interfaces ✅

### Test 2: Create User with Commercial Mode
1. Create a new user
2. Open permissions
3. Check only "🏢 Commercial"
4. Select commercial interfaces
5. Save
6. **Expected**: User has access only to commercial interfaces ✅

### Test 3: Create User with Both Modes
1. Create a new user
2. Open permissions
3. Check BOTH modes
4. Set permissions for each
5. Save
6. **Expected**: User has access to all selected interfaces from both modes ✅

### Test 4: Mode Switching
1. Open user permissions
2. Have both modes checked with permissions
3. Uncheck "📊 Mode Caisse"
4. **Expected**: Caisse permissions are removed, commercial permissions remain ✅

### Test 5: Modal Scrolling (Mobile)
1. On mobile or small screen
2. Open create user modal
3. Scroll within the modal
4. **Expected**: Form fields scroll inside modal without page scrolling ✅

## Files Modified

- `src/pages/Utilisateurs.tsx`
  - Added `caisseInterfaces` array with 12 interfaces
  - Added `commercialInterfaces` array with 17 interfaces
  - Added `selectedModes` state for mode management
  - Updated permissions modal with mode selector
  - Updated permissions modal content to show modes dynamically
  - Updated user creation modal for better UX (smaller, scrollable)
  - Added mode auto-detection on modal open
  - Added permission cleanup when unchecking modes

## UI/UX Changes

### Permissions Modal Header
- New section for mode selection
- Two checkboxes with icons and labels
- Clear visual distinction between modes
- Easy toggle without navigating tabs

### Permissions Content
- Interfaces list now changes based on selected modes
- Color coding: Teal for caisse, Cyan for commercial
- Proper spacing and alignment
- Scrollable content area for many permissions

### User Creation Modal
- Reduced from max-w-2xl to max-w-lg
- Set max-height with scrollable content
- Compact form layout
- Better footer button styling

## Future Enhancements

Potential improvements for future versions:
1. ✨ Preset permission templates (Admin, Manager, Worker, etc.)
2. ✨ Bulk permission management (assign to multiple users)
3. ✨ Permission audit log (track who changed what)
4. ✨ Role-based automatic mode assignment
5. ✨ Permission inheritance from role

## Support

If you encounter issues:
1. ✅ Verify RLS policies are in place (run FIX_RLS_USERS_PERMISSIONS.sql)
2. ✅ Clear browser cache and reload
3. ✅ Check browser console for errors (F12)
4. ✅ Verify database permissions are correctly saved
