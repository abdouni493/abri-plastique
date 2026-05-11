# 🔧 UPDATE: Fixed Product Update Error & Generated Columns

## 🐛 Issues Fixed

### Issue 1: Product Update Fails (400 Bad Request)
**Error**: `PATCH https://...products?id=eq.xxx 400 (Bad Request)`

**Root Cause**: Trying to update `prix_achat_ttc` which is a **generated column** (automatically calculated). Cannot be manually set.

**Status**: ✅ FIXED

### Issue 2: Product Information Not Updating After Purchase
**Problem**: When creating a purchase, the product's purchase price (`prix_achat_ht`) wasn't being updated.

**Status**: ✅ FIXED (Now only updates `prix_achat_ht`, lets DB calculate `prix_achat_ttc`)

### Issue 3: Line Totals Cannot Be Inserted
**Error**: `cannot insert a non-DEFAULT value into column "total_ht"`

**Status**: ⚠️ PENDING - Requires SQL migration (see below)

---

## ✅ Code Changes Applied

### File: [Achats.tsx](src/pages/Achats.tsx)

**Line 1039-1041** (Fixed):
```typescript
// BEFORE ❌
await supabase.from('products').update({
  current_quantity: newQty,
  prix_achat_ht: line.prixUnitHT,
  prix_achat_ttc: line.prixUnitHT * (1 + line.tva / 100),  // ❌ GENERATED - can't set!
}).eq('id', line.productId);

// AFTER ✅
await supabase.from('products').update({
  current_quantity: newQty,
  prix_achat_ht: line.prixUnitHT,
  // Database auto-calculates: prix_achat_ttc = prix_achat_ht * (1 + tva/100)
}).eq('id', line.productId);
```

---

## ⚠️ Still Required: Database Schema Migration

**You MUST run the updated SQL script** to convert generated columns:

### Updated File: [GENERATED_COLUMNS_FIX.sql](GENERATED_COLUMNS_FIX.sql)

**New additions**:
- ✅ Step 7: Converts `prix_achat_ttc` in `products` table to GENERATED column

**Steps 1-6 remain unchanged** (converts all `*_lines` tables)

---

## 🚀 What You Need To Do NOW

### Step 1: Apply Updated Database Schema

**In Supabase Dashboard:**
1. Go to https://app.supabase.com → Your Project
2. Open **SQL Editor** → **New Query**
3. Delete the old SQL script content (if you haven't run it yet)
4. Open [GENERATED_COLUMNS_FIX.sql](GENERATED_COLUMNS_FIX.sql)
5. Copy **ALL** the updated SQL
6. Paste into Supabase SQL Editor
7. Click **Execute**
8. ✅ Wait for "Success" message

### Step 2: Restart Your Application

```bash
# In terminal
npm run dev
```

### Step 3: Test Everything

1. **Create a new Purchase (Achat)**
   - Go to **Achats** menu
   - Click **"Nouveau Achat"**
   - Select a supplier
   - Add a product
   - Enter quantity and price
   - Click **"Enregistrer"**
   - ✅ Should work without errors

2. **Verify Product Updated**
   - Go to **Produits** (Products menu)
   - Find the product you just used in the purchase
   - Check that:
     - `Prix Achat HT` is updated ✅
     - `Prix Achat TTC` is calculated automatically ✅
     - `Stock` is updated ✅

3. **Test Other Modules**
   - Ventes (Sales) - should work
   - Bons de Commande (Purchase Orders) - should work
   - Factures Proformat (Pro Forma Invoices) - should work

---

## 📊 Summary of All Generated Columns

| Table | Column | Calculation | Status |
|-------|--------|-------------|--------|
| `achat_lines` | `total_ht` | quantity × prix_unit_ht | ⏳ Pending SQL |
| `achat_lines` | `total_tva` | (quantity × prix_unit_ht) × tva / 100 | ⏳ Pending SQL |
| `achat_lines` | `total_ttc` | total_ht × (1 + tva/100) | ⏳ Pending SQL |
| `vente_lines` | `total_ht` | quantity × prix_unit_ht | ⏳ Pending SQL |
| `vente_lines` | `total_tva` | (quantity × prix_unit_ht) × tva / 100 | ⏳ Pending SQL |
| `vente_lines` | `total_ttc` | total_ht × (1 + tva/100) | ⏳ Pending SQL |
| `bon_commande_lines` | `total_ht` | quantity × prix_unit_ht | ⏳ Pending SQL |
| `bon_commande_lines` | `total_tva` | (quantity × prix_unit_ht) × tva / 100 | ⏳ Pending SQL |
| `bon_commande_lines` | `total_ttc` | total_ht × (1 + tva/100) | ⏳ Pending SQL |
| `bon_livraison_lines` | `total_ht` | quantity × prix_unit_ht | ⏳ Pending SQL |
| `bon_livraison_lines` | `total_tva` | (quantity × prix_unit_ht) × tva / 100 | ⏳ Pending SQL |
| `bon_livraison_lines` | `total_ttc` | total_ht × (1 + tva/100) | ⏳ Pending SQL |
| `bon_reception_lines` | `total_ht` | quantity_recv × prix_unit_ht | ⏳ Pending SQL |
| `bon_reception_lines` | `total_tva` | (quantity_recv × prix_unit_ht) × tva / 100 | ⏳ Pending SQL |
| `bon_reception_lines` | `total_ttc` | total_ht × (1 + tva/100) | ⏳ Pending SQL |
| `facture_proformat_lines` | `total_ht` | quantity × prix_unit_ht | ⏳ Pending SQL |
| `facture_proformat_lines` | `total_tva` | (quantity × prix_unit_ht) × tva / 100 | ⏳ Pending SQL |
| `facture_proformat_lines` | `total_ttc` | total_ht × (1 + tva/100) | ⏳ Pending SQL |
| `products` | `prix_achat_ttc` | prix_achat_ht × (1 + tva/100) | ✅ **NEW** |

---

## 🔍 Files Modified

| File | Status | Changes |
|------|--------|---------|
| [Achats.tsx](src/pages/Achats.tsx) | ✅ Fixed | Line 1039-1041: Removed `prix_achat_ttc` from UPDATE |
| [GENERATED_COLUMNS_FIX.sql](GENERATED_COLUMNS_FIX.sql) | ⏳ Pending | Added Step 7 for `products` table |

---

## ✨ Why These Changes?

### Generated Columns vs Manual Updates
```
❌ DEFAULT column:
  - Database just provides default value
  - Can be overridden in INSERT/UPDATE
  - Can cause conflicts if frontend calc differs

✅ GENERATED ALWAYS AS ... STORED:
  - Database ALWAYS calculates the value
  - Cannot be overridden in INSERT/UPDATE
  - Always accurate, no conflicts
  - Read-only to application code
```

### Benefits
1. **Data Integrity** - Values always match calculations
2. **Prevents Errors** - DB rejects attempts to set calculated columns
3. **Simplifies Code** - Frontend doesn't calculate, just provides inputs
4. **Sync with UI** - What you see in form = what DB stores (calculated)

---

## 📝 Troubleshooting

**Q: Still getting 400 errors after applying SQL?**
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Restart dev server (`npm run dev`)

**Q: Products still not updating?**
- Check that `prix_achat_ht` is being set
- Verify the purchase was created successfully
- Check browser console for actual error details

**Q: SQL execution failed?**
- Make sure you're in the **SQL Editor** (not regular query builder)
- Copy the entire script (all 7 steps)
- Execute step-by-step if needed
- Check Supabase logs for detailed error

---

## ✅ Success Criteria

After applying all changes:
- ✅ Create purchase → no 400 errors
- ✅ Products auto-update with purchase price  
- ✅ Totals calculated automatically for all line items
- ✅ All commercial documents work (Achats, Ventes, Bons, Factures)

