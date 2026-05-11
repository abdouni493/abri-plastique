# 🔧 FIX: Generated Columns Error - Cannot Insert Into total_ht

## 🐛 Problem Summary

When creating new purchases (Achats) or other commercial documents, you received:
```
Error: cannot insert a non-DEFAULT value into column "total_ht"
Response: Column "total_ht" is a generated column
```

**Root Cause**: The database columns (`total_ht`, `total_tva`, `total_ttc`) are **generated columns** that should be automatically calculated by the database. Your frontend code was trying to manually insert calculated values into these columns, which is forbidden.

---

## ✅ Solution Applied

### Part 1: Frontend Code Changes (COMPLETED)

Fixed INSERT statements in 4 files to **remove** the calculated columns:

#### 1. **Achats.tsx** (2 locations)
- **Line 985-994**: Update existing achat lines
- **Line 1018-1027**: Create new achat lines

**Changed from:**
```typescript
const lines = achat.lines.map(l => ({
  ...
  total_ht: l.totalHT,        // ❌ REMOVE THIS
  total_ttc: l.totalTTC,      // ❌ REMOVE THIS
}));
```

**Changed to:**
```typescript
const lines = achat.lines.map(l => ({
  ...
  // ✅ Database calculates these automatically
}));
```

#### 2. **Ventes.tsx** (2 locations)
- **Line 985-994**: Update existing vente lines
- **Line 1015-1024**: Create new vente lines

Same fix applied - removed `total_ht` and `total_ttc` from INSERT payloads.

#### 3. **FactureProformat.tsx** (1 location)
- **Line 870-879**: Create facture proformat lines

#### 4. **BonCommande.tsx** (1 location)
- **Line 1370-1379**: Create bon lines (shared by all commercial documents)

Also fixed in related components:
- BonLivraison.tsx (shares code with BonCommande)
- BonReception.tsx (shares code with BonCommande)

---

### Part 2: Database Schema (REQUIRED)

**You must run the SQL script** to convert these columns from DEFAULT expressions to true GENERATED ALWAYS AS columns.

**File**: `GENERATED_COLUMNS_FIX.sql`

The script converts all line tables:
- ✅ `achat_lines`
- ✅ `vente_lines`
- ✅ `bon_commande_lines`
- ✅ `bon_livraison_lines`
- ✅ `bon_reception_lines`
- ✅ `facture_proformat_lines`

**How to apply:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire content of `GENERATED_COLUMNS_FIX.sql`
3. Execute the script
4. Wait for success confirmation

---

## 🔍 What Changed Exactly

### Database Level
**Before:**
```sql
total_ht numeric DEFAULT (quantity * prix_unit_ht)
```

**After:**
```sql
total_ht numeric GENERATED ALWAYS AS (quantity * prix_unit_ht) STORED
```

**Key Difference:**
- `DEFAULT`: Just a default value, but INSERT can override it
- `GENERATED ALWAYS AS ... STORED`: Computed column, READ-ONLY, always calculated

### Frontend Level
**Before:**
```typescript
await supabase.from('achat_lines').insert([
  {
    achat_id: '...',
    quantity: 5,
    prix_unit_ht: 1000,
    tva: 19,
    total_ht: 5000,        // ❌ Trying to override
    total_ttc: 5950,       // ❌ Trying to override
  }
]);
```

**After:**
```typescript
await supabase.from('achat_lines').insert([
  {
    achat_id: '...',
    quantity: 5,
    prix_unit_ht: 1000,
    tva: 19,
    // ✅ Database auto-calculates:
    // total_ht = 5 * 1000 = 5000
    // total_tva = 5000 * 19 / 100 = 950
    // total_ttc = 5000 * 1.19 = 5950
  }
]);
```

---

## 📋 Files Modified

| File | Changes | Status |
|------|---------|--------|
| `src/pages/Achats.tsx` | Removed `total_ht`, `total_ttc` from 2 INSERT locations | ✅ Done |
| `src/pages/Ventes.tsx` | Removed `total_ht`, `total_ttc` from 2 INSERT locations | ✅ Done |
| `src/pages/FactureProformat.tsx` | Removed `total_ht`, `total_ttc` from INSERT | ✅ Done |
| `src/pages/BonCommande.tsx` | Removed `total_ht`, `total_ttc` from INSERT | ✅ Done |
| `src/pages/BonLivraison.tsx` | Uses shared code (fixed via BonCommande) | ✅ Done |
| `src/pages/BonReception.tsx` | Uses shared code (fixed via BonCommande) | ✅ Done |
| `GENERATED_COLUMNS_FIX.sql` | NEW - Schema migration script | ⚠️ PENDING |

---

## 🚀 Next Steps

### 1. Apply Database Schema Changes (CRITICAL)
```bash
# Go to: https://app.supabase.com/project/[your-project]/sql/new
# Copy & execute: GENERATED_COLUMNS_FIX.sql
```

### 2. Test Your Application
1. Start the dev server: `npm run dev`
2. Navigate to **Achats** (Purchases)
3. Click **"Nouveau Achat"** (New Purchase)
4. Add products and save
5. Should now work without the "cannot insert" error ✅

### 3. Test Other Modules
- Ventes (Sales)
- Factures Proformat (Pro Forma Invoices)
- Bons de Commande (Purchase Orders)
- Bons de Livraison (Delivery Notes)
- Bons de Réception (Reception Notes)

---

## ✨ Why This Works

The frontend code **doesn't need to calculate** totals for database insertion:
- ✅ Calculations are **only for display** in the UI
- ✅ Database handles the **authoritative computation**
- ✅ Prevents **rounding discrepancies** between frontend and database
- ✅ Ensures **data integrity** - totals always match calculations

---

## 📝 Troubleshooting

**If you still get errors after applying the SQL:**

1. **Check Supabase SQL execution**: Did the script complete without errors?
2. **Verify column type**: Query your table
   ```sql
   SELECT column_name, column_default, is_generated
   FROM information_schema.columns
   WHERE table_name = 'achat_lines' AND column_name IN ('total_ht', 'total_tva', 'total_ttc');
   ```
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Restart dev server**: Kill and rerun `npm run dev`

---

## 📚 Reference

- **Generated Columns**: [PostgreSQL Docs](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
- **Supabase & Generated Columns**: [Supabase Guide](https://supabase.com/docs/guides/database/tables)
- **Frontend Code**: See modified files in this commit

---

## ✅ Verification Checklist

- [x] Frontend code updated (removed calculated columns from INSERT)
- [x] SQL schema script provided
- [ ] Database schema migrated
- [ ] Application tested successfully
- [ ] All commercial documents working (Achats, Ventes, Bons, Factures)
