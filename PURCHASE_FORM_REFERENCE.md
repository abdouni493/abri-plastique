# 🎯 Purchase Form - Quick Reference

## ✨ New Features

### 1. Selling Price (P.V HT) - Blue Column
- **Field:** `prix_vente`
- **Purpose:** Set the selling price for products
- **Auto-filled:** From product's current selling price
- **Editable:** Yes, during purchase
- **Updates:** Product's `prix_vente` field

### 2. Price Limit (Limite P.V) - Orange Column
- **Field:** `limite_prix_vente`
- **Purpose:** Define the maximum allowed selling price
- **Auto-filled:** From product's current price limit
- **Editable:** Yes, during purchase
- **Updates:** Product's `limite_prix_vente` field

### 3. Minimal Quantity (Qté Min) - Purple Column
- **Field:** `quantity_minimal`
- **Purpose:** Set the reorder/safety stock level
- **Auto-filled:** From product's current minimal quantity
- **Editable:** Yes, during purchase
- **Updates:** Product's `quantity_minimal` field

---

## 📊 Purchase Form Columns (Left to Right)

```
Désignation | Qté | P.U HT | TVA % | P.V HT | Limite P.V | Qté Min | Total TTC | Delete
   (Text)   | (Num) | (Price) | (%) | (Price) | (Price)  | (Num)  | (Calc)  | (Btn)
```

---

## 🔄 Data Flow

### When Adding a Product:
```
Product Selected
    ↓
Auto-fill all fields from product master data
    ├─ designation
    ├─ prix_achat_ht (Purchase Price)
    ├─ tva (Tax Rate)
    ├─ prix_vente (Selling Price) ← NEW
    ├─ limite_prix_vente (Price Limit) ← NEW
    └─ quantity_minimal (Min Qty) ← NEW
    ↓
Display in editable table row
```

### When Saving Purchase:
```
For Each Product in Purchase:
    ↓
    Retrieve current product data
    ↓
    Calculate new quantities:
    ├─ new_current_qty = current_qty + purchased_qty
    └─ new_initial_qty = initial_qty + purchased_qty
    ↓
    Update product fields:
    ├─ current_quantity = new_current_qty
    ├─ quantity_initial = new_initial_qty
    ├─ prix_achat_ht = purchase price from form
    ├─ prix_vente = selling price from form ← NEW
    ├─ limite_prix_vente = price limit from form ← NEW
    └─ quantity_minimal = min qty from form ← NEW
    ↓
    Create stock movement record
```

---

## 💾 Database Updates

When purchase is saved, these product fields are updated:

| Field | Source | Type | Example |
|-------|--------|------|---------|
| current_quantity | current + purchased | Number | 100 + 50 = 150 |
| quantity_initial | initial + purchased | Number | 200 + 50 = 250 |
| prix_achat_ht | Form P.U HT | Decimal | 500.00 |
| prix_vente | Form P.V HT | Decimal | 750.00 |
| limite_prix_vente | Form Limite P.V | Decimal | 850.00 |
| quantity_minimal | Form Qté Min | Number | 75 |

---

## ✅ Example Scenario

**Initial Product State:**
- Name: "Widget Pro"
- current_quantity: 100
- quantity_initial: 500
- quantity_minimal: 50
- prix_achat_ht: 300 DA
- prix_vente: 500 DA
- limite_prix_vente: 600 DA

**Purchase 200 units:**
```
Form Row:
├─ Désignation: Widget Pro
├─ Qté: 200 ← entered
├─ P.U HT: 320 ← new purchase price
├─ TVA %: 19
├─ P.V HT: 600 ← update selling price
├─ Limite P.V: 700 ← update price limit
└─ Qté Min: 75 ← update minimum
```

**After Save:**
```
Product Updates:
├─ current_quantity: 300 (100 + 200) ✅
├─ quantity_initial: 700 (500 + 200) ✅
├─ quantity_minimal: 75 ✅
├─ prix_achat_ht: 320 ✅
├─ prix_vente: 600 ✅
└─ limite_prix_vente: 700 ✅

Stock Movement Created:
├─ Before: 100 units
├─ Change: +200 units
├─ After: 300 units
└─ Reason: "Achat ACH-2024-0045"
```

---

## 🚀 Usage Tips

### Tip 1: Bulk Update Prices
- Add multiple products with same purchase
- Edit selling prices all at once
- Click Save → All products updated together

### Tip 2: Set Different Price Limits
- Each product can have different limits
- Helps enforce price controls by product
- Updates automatically on purchase

### Tip 3: Reorder Levels
- Set minimal quantities strategically
- Helps with automatic reorder alerts
- Can be adjusted per purchase

---

## ⚙️ Technical Details

**Files Modified:**
- `src/pages/Achats.tsx`

**Functions Updated:**
- `addProduct()` - Captures new fields
- `updateLine()` - Allows editing new fields
- `handleSave()` - Saves new fields to DB

**Database Columns Used:**
- products.prix_vente
- products.limite_prix_vente
- products.quantity_minimal
- products.current_quantity
- products.quantity_initial

**Type Safety:**
- All fields are optional (?) to maintain compatibility
- Fallback to product current values if not provided
- Full TypeScript support

---

## 🎨 UI Colors

- **Blue Border** = Selling Price inputs
- **Orange Border** = Price Limit inputs
- **Purple Border** = Minimal Qty inputs
- **Green Border** = Purchase price & Tax inputs
- **Red Button** = Delete row

---

## ✓ Ready to Use!

All features are:
- ✅ Implemented
- ✅ Type-safe
- ✅ Database-aligned
- ✅ Production-ready

Start creating purchases with full product pricing control! 🎉
