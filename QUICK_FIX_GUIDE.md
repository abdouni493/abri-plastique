# ⚡ Quick Fix Guide - 3 Steps

## Problem
```
Error: cannot insert a non-DEFAULT value into column "total_ht"
Details: Column "total_ht" is a generated column
```

## Solution

### Step 1: Update Application (✅ DONE)
Your code has been fixed. These files were updated:
- ✅ Achats.tsx
- ✅ Ventes.tsx
- ✅ FactureProformat.tsx
- ✅ BonCommande.tsx
- ✅ BonLivraison.tsx (via shared code)
- ✅ BonReception.tsx (via shared code)

### Step 2: Update Database (⚠️ YOU DO THIS NOW)

**Go to Supabase Dashboard:**
1. Open https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Open file: `GENERATED_COLUMNS_FIX.sql` from your project
6. Copy ALL the SQL code
7. Paste into Supabase SQL Editor
8. Click **Execute** / **Run**
9. ✅ Wait for success message

### Step 3: Restart & Test

**In your terminal:**
```bash
npm run dev
```

**Test in browser:**
1. Go to Achats (Purchases)
2. Click "Nouveau Achat"
3. Add a product
4. Click "Enregistrer"
5. ✅ Should work now!

---

## What Was Wrong?

Your database had columns marked as `DEFAULT` that calculated values:
```sql
-- OLD (causes error)
total_ht numeric DEFAULT (quantity * prix_unit_ht)

-- NEW (auto-calculated, read-only)
total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED
```

The **frontend code** was trying to INSERT these calculated values, but the database said "No! These are READ-ONLY!"

Now the database calculates them automatically. ✅

---

## Need Help?

If Step 2 fails:
1. Check if SQL executed without errors
2. Hard refresh browser (Ctrl+Shift+R)
3. Restart dev server
4. Try again

See `FIX_GENERATED_COLUMNS.md` for detailed troubleshooting.
