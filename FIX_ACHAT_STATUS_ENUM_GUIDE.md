# 🔧 Fix: Purchase Status ENUM Update Required

## ❌ Problem
The database ENUM type `achat_status` doesn't include the new status values:
- Error: `invalid input value for enum achat_status: "dette"`

## ✅ Solution

The app code has been updated to automatically set purchase status based on payment:
- **Full Payment** (montantPaye ≥ totalTTC) → Status: `payé` ✅
- **Partial Payment** (0 < montantPaye < totalTTC) → Status: `dette` ✅
- **No Payment** (montantPaye = 0) → Status: `brouillon` (stays as draft)

However, **the database ENUM type must be updated** to accept these new values.

---

## 📋 Quick Steps to Fix

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Create New Query
1. Click **New Query** (+ button)
2. Copy the SQL from `FIX_ACHAT_STATUS_ENUM.sql` in your project

### Step 3: Execute the Migration
1. Paste the SQL code into the editor
2. Click **Execute** or **Run**
3. Wait for success message (should see no errors)

### Step 4: Test the App
1. Go back to your app
2. Create a new purchase with payment
3. Test both scenarios:
   - Pay full amount → Should show **"Payée"** (green status)
   - Pay partial amount → Should show **"En Dettes"** (red status)

---

## 📊 Status Values After Fix

| Status | Label | Color | Meaning |
|--------|-------|-------|---------|
| `brouillon` | Brouillon | Amber | Draft, no payment yet |
| `commande` | Commandée | Emerald | Order placed |
| `livree` | Livrée | Teal | Delivered |
| `payé` | **Payée** | **Green** | ✅ Fully paid |
| `dette` | **En Dettes** | **Red** | ⚠️ Partial payment |

---

## 🔍 What Changed in Code

✅ **Updated Files:**
- `Achats.tsx`: Status type now includes `'payé' | 'dette'`
- `Achats.tsx`: Form automatically sets status based on payment amount
- `Achats.tsx`: Database insert/update uses correct final status
- `Achats.tsx`: STATUS_MAP includes color styling for new statuses

✅ **How It Works:**
1. User enters payment amount in form
2. Frontend calculates: `montantPaye` vs `totalTTC`
3. Status automatically set:
   - `montantPaye >= totalTTC` → `payé`
   - `0 < montantPaye < totalTTC` → `dette`
4. Database saves with correct status

---

## ✅ You're Done!

After running the SQL migration, the app will work perfectly with full payment tracking and automatic status management.

**Still having issues?** Make sure you:
- Ran the SQL query successfully (check for green checkmark)
- Waited a few seconds after execution
- Refreshed your app (Ctrl+F5)
- Cleared browser cache if needed

---

## 📝 SQL Changes Made

**File: `FIX_ACHAT_STATUS_ENUM.sql`**

```sql
ALTER TYPE achat_status ADD VALUE 'payé' BEFORE 'livree';
ALTER TYPE achat_status ADD VALUE 'dette' BEFORE 'livree';
```

This safely adds the new enum values without affecting existing data.
