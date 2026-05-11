# 🔄 Source Bon Search Feature - Complete Guide

## Overview

A powerful new feature has been added to **Bons de Livraison** and **Bons de Réception** creation interfaces. Users can now search for and convert source documents directly during creation, automatically populating all products and details.

---

## 🎯 Feature Details

### What It Does

**On Bons de Livraison (BL):**
- Search for existing **Bons de Commande (BC)**
- Auto-populate the BL form with BC products, quantities, and totals
- Maintain client information and payment mode
- Create BL as conversion from BC

**On Bons de Réception (BR):**
- Search for existing **Bons de Livraison (BL)**
- Auto-populate the BR form with BL products, quantities, and totals
- Maintain supplier information and payment mode
- Create BR as conversion from BL

### When It Appears

The source bon search appears **only when:**
1. Creating a **new** document (not editing existing)
2. NOT using the "Convert" button (conversion uses direct button method)
3. On **Bons de Livraison** or **Bons de Réception** pages

### How It Works

```
✅ Create Bon de Commande (BC)
    ↓
✅ Save BC (stored in localStorage)
    ↓
✅ Go to Bons de Livraison page
    ↓
✅ Click "Nouveau Bon" button
    ↓
✅ Search box appears: "Rechercher un Bon de Commande..."
    ↓
✅ Type BC number (e.g., "BC-2026-1234")
    ↓
✅ Select BC from dropdown
    ↓
✅ Form auto-populates with products & details
    ↓
✅ Edit if needed
    ↓
✅ Save BL
```

---

## 🎨 UI Components

### 1. Source Search Box

Appears at the top of the form with a green/emerald theme:

```
┌─────────────────────────────────────────────────────────┐
│ ➜ Rechercher et convertir un document source           │
│ 🔍 Rechercher un Bon de Commande...                    │
│ 💡 Sélectionnez un Bon de Commande pour auto-remplir   │
└─────────────────────────────────────────────────────────┘
```

**Search Features:**
- Auto-complete as you type
- Search by document number (e.g., "BC-2026-1234")
- Search by client/supplier name
- Displays: Number, Name, Total TTC, Product Count, Status

### 2. Selected Bon Card

After selection, displays confirmation card:

```
┌─────────────────────────────────────────────────────────┐
│ ✅ Converti depuis BC-2026-1234                         │
│ 5 produits · 125,000.00 DA              [✕]            │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Shows source document number
- Displays product count and total amount
- "X" button to clear selection and start over
- Green checkmark icon for visual confirmation

### 3. Auto-Populated Form

Once source bon is selected, the form automatically fills:

| Field | Auto-Populated? | Source |
|-------|-----------------|--------|
| Document Number | ✅ | New auto-generated number |
| Date | ✅ | Today's date |
| Delivery Date | ✅ | From source bon |
| Client/Supplier | ✅ | From source bon |
| Products & Lines | ✅ | All products copied |
| Quantities | ✅ | From source bon |
| Unit Prices | ✅ | From source bon |
| TVA % | ✅ | From source bon |
| Totals (HT/TVA/TTC) | ✅ | Auto-calculated from products |
| Payment Mode | ✅ | From source bon |
| Status | ✅ | Set to "Brouillon" (Draft) |
| Notes | ✅ | From source bon |

---

## 🔍 Search Dropdown Details

### Dropdown Features

```
Search Results Display:
┌────────────────────────────────────────────────────┐
│ 📄 BC-2026-1234                                    │
│ SARL TechPro · 125,000.00 DA                       │
│ 5 produits | brouillon                             │
├────────────────────────────────────────────────────┤
│ 📄 BC-2026-5678                                    │
│ EURL Design · 89,500.00 DA                         │
│ 3 produits | confirme                              │
└────────────────────────────────────────────────────┘
```

### Dropdown Behavior

1. **Opens** when you:
   - Click in the search field
   - Start typing
   
2. **Shows** up to 8 matching results

3. **Closes** when you:
   - Select a document
   - Click outside the dropdown
   - Clear the search

4. **Matches** on:
   - Document number (partial or full)
   - Client/Supplier name (case-insensitive)
   - Example: Type "TechPro" to find all docs from that client

---

## 💾 Data Persistence

### How It Works

1. **Each document type has its own storage:**
   - Bons de Commande → `localStorage['bons_commande']`
   - Bons de Livraison → `localStorage['bons_livraison']`
   - Bons de Réception → `localStorage['bons_reception']`
   - Factures Proformat → `localStorage['bons_proformat']`

2. **Auto-saved when:**
   - You click "Enregistrer" (Save)
   - You delete a document

3. **Auto-loaded when:**
   - You navigate to that page
   - You refresh the browser
   - You open the application

### Important Notes

- **Browser-based storage:** Data is stored in your browser's localStorage
- **Per-browser:** Data is unique to each browser (not synced across browsers)
- **Persistent:** Data survives page refreshes and browser restarts
- **Clearable:** Clearing browser cache will clear all stored data

---

## 📋 Workflow Examples

### Example 1: Commission to Delivery to Reception

**Step 1: Create Bon de Commande**
```
1. Go to "Bons de Commande"
2. Click "Nouveau Bon"
3. Select supplier: SARL Grossiste Algiers
4. Add products: Laptop x2, Mouse x5
5. Click "Enregistrer"
→ BC-2026-1234 created and stored
```

**Step 2: Convert to Bon de Livraison (using search)**
```
1. Go to "Bons de Livraison"
2. Click "Nouveau Bon"
3. Search box appears automatically
4. Type "BC-2026-1234" or supplier name
5. Select from dropdown
6. Form auto-fills with all products
7. Verify quantities and edit if needed
8. Click "Enregistrer"
→ BL-2026-5678 created
```

**Step 3: Convert to Bon de Réception (using search)**
```
1. Go to "Bons de Réception"
2. Click "Nouveau Bon"
3. Search box appears automatically
4. Type "BL-2026-5678" or client name
5. Select from dropdown
6. Form auto-fills with all products
7. Verify quantities and edit if needed
8. Click "Enregistrer"
→ BR-2026-9012 created
```

### Example 2: Quick Duplicate for Multiple Deliveries

**Scenario:** Split one order into two deliveries

```
BC-2026-1234: 10x Product A, 5x Product B

Split into:
BL-2026-5678: 6x Product A, 3x Product B (first delivery)
BL-2026-9999: 4x Product A, 2x Product B (second delivery)

Process:
1. Create first BL from BC → Save
2. Create second BL from BC → Edit quantities → Save
```

---

## 🎯 Conversion Methods - When to Use Each

### Method 1: Convert Button (Fast)
```
Bon de Commande page → Click "Convertir en BL" button → Form opens
✅ Pre-fills everything automatically
✅ Creates new document right away
✅ Fastest method
```

### Method 2: Source Search (Flexible)
```
Bons de Livraison page → Click "Nouveau Bon" → Search & select → Form opens
✅ Can choose from multiple source bons
✅ Can edit details before saving
✅ More flexible for complex workflows
```

### When to Use Each:

| Scenario | Method | Why |
|----------|--------|-----|
| Simple linear workflow: BC→BL→BR | Convert Button | Fastest, most direct |
| Need to pick from multiple BCs | Source Search | Find the right BC first |
| Want to review before saving | Source Search | Edit before committing |
| Creating multiple conversions | Source Search | Easier to iterate |
| One-click creation | Convert Button | Quickest |

---

## ⚙️ Technical Details

### New Components

#### `SourceBonSearch`
- **Location:** BonCommande.tsx
- **Purpose:** Dropdown search for source documents
- **Features:**
  - Auto-complete search
  - Results dropdown with animations
  - Click-outside to close
  - Displays 8 max results

#### `handleSourceBonSelect`
- **Location:** BonForm component
- **Purpose:** Handle selection and auto-populate
- **Does:**
  - Generates new document number
  - Sets today's date
  - Copies all products and lines
  - Copies client/supplier info
  - Copies totals and payment mode
  - Resets status to "brouillon"

### State Management

```typescript
// New state in BonForm
const [selectedSourceBon, setSelectedSourceBon] = useState<BonCommande | null>(null);

// New state in CommercialDocList
// (loaded from localStorage on mount)
useEffect(() => {
  const stored = localStorage.getItem(`bons_${type}`);
  if (stored) setBons(JSON.parse(stored));
}, [type]);
```

### LocalStorage Keys

```javascript
localStorage.getItem('bons_commande')    // Array of BC documents
localStorage.getItem('bons_livraison')   // Array of BL documents
localStorage.getItem('bons_reception')   // Array of BR documents
localStorage.getItem('bons_proformat')   // Array of FP documents
```

---

## 🚀 Usage Tips & Tricks

### Tip 1: Search Efficiently
```
💡 Instead of typing full number "BC-2026-1234"
   Just type "2026" to find all docs from 2026
   Or type client name "TechPro" to find their orders
```

### Tip 2: Edit After Selection
```
💡 Don't like auto-filled quantities?
   1. Select source bon
   2. Form auto-fills
   3. Edit any quantities/prices
   4. Save modified version
```

### Tip 3: Copy Multiple Conversions
```
💡 Need to split an order into 2 deliveries?
   1. Search & select BC → Save as BL#1
   2. Search & select SAME BC → Save as BL#2
   3. Edit each BL quantities differently
```

### Tip 4: Check Status in Dropdown
```
💡 Dropdown shows status:
   - "brouillon" (draft) = incomplete
   - "confirme" (confirmed) = ready
   - Select confirmed docs to ensure reliability
```

### Tip 5: Undo Selection
```
💡 Selected wrong document?
   Click the X button on the confirmation card
   Search box reappears, start over
```

---

## ❌ Troubleshooting

### Issue: Search box doesn't appear

**Possible causes:**
1. ✅ You're editing an existing document (search only for new docs)
2. ✅ You're on Bon de Commande page (search only on BL/BR pages)
3. ✅ You used the Convert button (different creation method)

**Solution:** Create a new BL or BR document without using Convert button

### Issue: Can't find source document

**Possible causes:**
1. ✅ Source document not saved yet
2. ✅ Source document in different browser
3. ✅ Browser cache cleared
4. ✅ Typing incomplete document number

**Solutions:**
- Refresh the page: `F5`
- Make sure source doc is saved on this browser
- Type partial matches: client name or year

### Issue: Wrong data auto-filled

**Possible causes:**
1. ✅ Selected wrong document from dropdown
2. ✅ Source document has incorrect data

**Solution:**
1. Click X button to clear selection
2. Search again and select correct document
3. Or edit auto-filled data and save

### Issue: Data not saved after selection

**Ensure:**
1. ✅ Click "Enregistrer" button (Save)
2. ✅ Don't just close the form
3. ✅ Form should reset after saving

---

## 📊 Performance Considerations

### Why localStorage?

✅ **Advantages:**
- Instant loading (no server requests)
- Persists across sessions
- Works offline
- No storage quotas for typical app

⚠️ **Limitations:**
- Limited to ~5-10MB per browser
- Not synced across browsers
- Not backed up automatically

### Search Performance

- ✅ Searches 8 matching results max (limited dropdown)
- ✅ Real-time search as you type (no delay)
- ✅ Works smoothly with 100+ documents

---

## 🔐 Data Privacy

### What Is Stored?

Each saved document includes:
- Document number and type
- Client/Supplier details
- Product information
- Quantities and prices
- Totals and calculations
- Payment mode and status
- Dates and notes

### Security Notes

- 📍 **Browser-only:** Data never leaves your browser
- 🔒 **Local access:** Only accessible in your browser
- ⚠️ **Not encrypted:** Stored as plain JSON in localStorage
- 🧹 **Clearable:** Deleted when cache is cleared

---

## 🔄 Workflow Diagram

```
START
  │
  ├─→ Create Bon de Commande
  │    └─→ Save → BC stored in localStorage['bons_commande']
  │
  ├─→ Go to Bons de Livraison
  │    └─→ Click "Nouveau Bon"
  │         └─→ Search box appears
  │              └─→ Type/Search for BC
  │                   └─→ Select from dropdown
  │                        └─→ Form auto-populates
  │                             ├─→ Edit if needed
  │                             └─→ Save → BL stored
  │
  ├─→ Go to Bons de Réception
  │    └─→ Click "Nouveau Bon"
  │         └─→ Search box appears
  │              └─→ Type/Search for BL
  │                   └─→ Select from dropdown
  │                        └─→ Form auto-populates
  │                             ├─→ Edit if needed
  │                             └─→ Save → BR stored
  │
  └─→ Continue workflow...
```

---

## 📝 Summary

| Feature | Details |
|---------|---------|
| **Where** | Bons de Livraison & Réception (new doc creation) |
| **What** | Search & select source bon to auto-populate |
| **How** | Click search box, type number/name, select |
| **Why** | Fast conversion, maintains data consistency |
| **When** | When creating new BL from BC or BR from BL |
| **Storage** | Browser localStorage (automatic) |
| **Data** | All products, quantities, totals, details |
| **Editing** | Yes, edit auto-filled data before saving |
| **Undo** | Click X to clear selection and restart |

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** May 4, 2026

For more information, see [CODE_REFERENCE.md](./CODE_REFERENCE.md) and [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
