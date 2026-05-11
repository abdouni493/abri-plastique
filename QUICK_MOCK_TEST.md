# 🧪 Quick Mock Data Testing Guide

## ⚡ Get Started in 30 Seconds

### Step 1: Clear Browser Data
```javascript
// Open DevTools (F12) → Console → paste:
localStorage.clear();
```

### Step 2: Refresh Page
Press `F5` or Ctrl+R

### Step 3: View Mock Data
All documents now show with sample data! ✅

---

## 📊 What You'll See

### Bon de Commande (Orders)
- Document: **BC-2026-1001**
- Shows: 2 Laptops + 5 Keyboards
- Status: Confirmé (Blue)

### Bon de Livraison (Delivery Notes)
- Document: **BL-2026-5001**
- Shows: 3 Screens + 10 Mice
- Status: Livré (Green)

### Bon de Réception (Reception Notes)
- Document: **BR-2026-3001**
- Shows: 4 SSDs + 1 Printer
- Status: Confirmé (Blue)

### Facture Proformat (Proforma Invoices)
- Document: **FP-2026-7001** (Confirmed)
- Document: **FP-2026-7002** (Draft)

---

## 🎯 Test Scenarios

### Test 1: List View
✅ Open any document type
✅ See mock data in table
✅ Check statistics cards
✅ Verify totals

### Test 2: Search
✅ Search by document number (e.g., "BC-2026")
✅ Search by client/supplier name
✅ Filter by status

### Test 3: Create
✅ Click "Nouveau" button
✅ Add products
✅ Select client/supplier
✅ Save new document
✅ Mock data remains in list

### Test 4: View Details
✅ Click "👁" (eye) icon
✅ See full document details
✅ View items table
✅ Check totals

### Test 5: Edit
✅ Click "✏️" (edit) icon
✅ Modify quantities
✅ Add/remove items
✅ Save changes

### Test 6: Delete
✅ Click "🗑️" (delete) icon
✅ Confirm deletion
✅ Other mock data remains

### Test 7: Print
✅ Click "🖨️" (print) icon
✅ Print preview opens
✅ Professional template shows
✅ All data included

### Test 8: Status Filter
✅ Use status dropdown
✅ Filter by: Brouillon, Confirmé, Livré, Annulé
✅ Only matching documents show

---

## 🔧 Mock Data Distribution

```
Total Products: 5 (in all documents)
├─ Laptop Dell XPS 13
├─ Souris Logitech MX Master 3
├─ Clavier Mécanique Corsair K95
├─ Écran LG 27" 4K IPS
└─ Câble HDMI 2.1 2m

Total Clients: 4
├─ SARL TechPro Algiers
├─ EURL Amine Design
├─ Cabinet Medical Dr. Yacine
└─ Oran Logistics Group

Total Suppliers: 3
├─ Grossiste Algiers IT
├─ Bureau Bureau & Co
└─ Global Tech Distribution

Total Mock Documents: 5
├─ 1 Bon de Commande
├─ 1 Bon de Livraison
├─ 1 Bon de Réception
└─ 2 Factures Proformat
```

---

## 💡 Key Features to Test

### ✅ Search Functionality
```
Types: By number, By name
Example: Search "TechPro" → Shows all TechPro documents
```

### ✅ Filtering
```
By Status: Brouillon, Confirmé, Livré, Annulé
By Amount: Totals shown in statistics
```

### ✅ Calculations
```
All totals are auto-calculated:
- Total HT (before tax)
- Total TVA (tax amount)
- Total TTC (final amount)
```

### ✅ Data Persistence
```
Create new document → Refresh → Document still there
Delete document → Refresh → Document gone (but mock data saved)
```

---

## ❌ Reset to Fresh Mock Data

### Option 1: Clear All
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Option 2: Clear Specific Type
```javascript
// In browser console
localStorage.removeItem('bons_commande');
localStorage.removeItem('bons_livraison');
localStorage.removeItem('bons_reception');
localStorage.removeItem('factures_proformat');
location.reload();
```

---

## 🎓 What This Proves

✅ **No Backend Needed** - Works 100% offline
✅ **Type Safety** - Full TypeScript strict mode
✅ **Real-World Data** - Professional business documents
✅ **Complete Features** - All CRUD operations work
✅ **Professional UI** - Production-ready interface
✅ **Persistent** - Data survives page refresh
✅ **Printable** - Professional print templates
✅ **Searchable** - Find documents instantly

---

## 📱 Browser Support

✅ Works in all modern browsers
✅ localStorage available: Chrome, Firefox, Safari, Edge
✅ Print function: All browsers
✅ Responsive design: Mobile/Tablet/Desktop

---

## 🚀 Next Steps

After testing mock data:

1. **Connect to Backend**: Replace mock data with API calls
2. **Add Authentication**: Implement user login
3. **Add Validation**: Add business rules
4. **Add Notifications**: Toast/alerts for actions
5. **Add More Features**: Export to PDF, Email, etc.

---

**Status**: ✅ Ready for testing with zero database setup required!

