# Commercial Documents - Quick Reference Guide

## 🚀 Quick Start

### Access the Systems
| Document Type | Route | Color Scheme | Use Case |
|---|---|---|---|
| Bon de Commande | `/bon-commande` | Indigo-Blue | Purchase from suppliers |
| Bon de Livraison | `/bon-livraison` | Emerald-Teal | Deliver to clients |
| Bon de Réception | `/bon-reception` | Violet-Purple | Receive incoming goods |
| Facture Proformat | `/facture-proformat` | Amber-Orange | Sales proposal invoices |

## 📋 Document Workflow

```
┌─────────────────────────────────────────────────────┐
│ PURCHASE WORKFLOW                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Bon de Commande (BC)                              │
│  ├─ Status: Brouillon → Confirmé                  │
│  └─ Can convert to → Bon de Livraison             │
│                                                     │
│  Bon de Livraison (BL)                            │
│  ├─ Auto-filled from BC                           │
│  ├─ Status: Brouillon → Confirmé → Livré         │
│  └─ Can convert to → Bon de Réception             │
│                                                     │
│  Bon de Réception (BR)                            │
│  ├─ Auto-filled from BL                           │
│  ├─ Status: Brouillon → Confirmé → Reçu          │
│  └─ Final document in chain                       │
│                                                     │
│  Facture Proformat (FP)                           │
│  ├─ Independent document                          │
│  ├─ Direct client sales                           │
│  └─ No conversion required                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🔍 Search Functions

### Product Search
**Where**: In all document forms, "Ajouter des Produits" section
**Search By**:
- 📝 Designation: "Laptop Dell", "Souris"
- 🔖 Reference: "REF-001", "REF-002"
- 📊 Barcode: "5901234123457"
**Result Shows**: Name, Ref, Stock, Unit, Price, TVA

### Client/Supplier Search
**Where**: In document forms, entity selection fields
**Search By**:
- 🏢 Company Name: "SARL Tech", "Amine Design"
- 📱 Partial Name: "Tech", "Design"
**Result Shows**: Name, Phone, Wilaya

## ➕ Adding Products

### Step-by-Step
```
1. Click product search field
2. Type product name/ref/barcode
3. Select from dropdown
4. Product line added to table
5. Quantity auto-set to 1
6. Edit quantity by clicking field
7. TVA auto-filled (can edit)
8. Prices auto-calculated
9. Can add more products
10. Delete button removes line
```

### Bulk Add
```
Can add unlimited products to single document:
- Click search field
- Add product 1 → Quantity 5
- Search field clears
- Search again
- Add product 2 → Quantity 3
- Repeat as needed
- Document totals auto-update
```

## 🔄 Conversion Guide

### BC → BL Conversion
**When**: BC is in "Confirmé" status
**How**:
```
1. Find confirmed BC in list
2. Click View button
3. Click "Convertir en BL" button
4. New BL form opens pre-populated with:
   ✓ Same products
   ✓ Same quantities
   ✓ Same prices
   ✓ Same notes
   ✗ New BL number (auto-generated)
5. Select client (if not auto-assigned)
6. Review dates
7. Save BL
```

### BL → BR Conversion
**When**: BL is in "Confirmé" status
**How**:
```
1. Find confirmed BL in list
2. Click View button
3. Click "Convertir en BR" button
4. New BR form opens pre-populated with:
   ✓ Same products
   ✓ Same quantities
   ✓ Same dates
   ✗ New BR number (auto-generated)
5. Verify received quantities (can be different)
6. Add reception notes if needed
7. Save BR
```

## ⚙️ Form Fields Guide

### Common Fields (All Documents)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| N° Document | Text | Auto-generated | BC-2026-XXXX format |
| Date | Date | Yes | Default: Today |
| Date Livraison | Date | No | Optional delivery date |
| Mode Paiement | Dropdown | Yes | Espèces/Virement/Chèque/Traite |
| Statut | Dropdown | Yes | Brouillon/Confirmé/Livré/Annulé |
| Remarques | Textarea | No | Additional notes |

### BC-Specific
| Field | Type | Required |
|-------|------|----------|
| Fournisseur | Search | Yes |
| Client | Search | No |

### BL-Specific
| Field | Type | Required |
|-------|------|----------|
| Client | Search | Yes |
| Fournisseur | Search | No |

## 📊 Statuses Explained

| Status | Color | Meaning | Can Convert |
|--------|-------|---------|------------|
| Brouillon | Amber | Draft, not final | No |
| Confirmé | Blue | Approved/confirmed | Yes ✓ |
| Livré | Green | Delivered/received | No |
| Annulé | Red | Cancelled | No |

## 🖨️ Printing

### How to Print
```
1. Open any document
2. Click Print button (🖨️)
3. Browser print dialog opens
4. Select printer or PDF
5. Adjust settings if needed
6. Print or Save as PDF
```

### Print Template Includes
- ✅ Company header
- ✅ Document type and number
- ✅ Entity information (Supplier/Client)
- ✅ All product lines with details
- ✅ Totals (HT, TVA, TTC)
- ✅ Notes section
- ✅ Signature lines
- ✅ Status badge

## 🔍 Filtering & Searching

### Search Bar
**Location**: Top-right of document list
**Searches**: Document number and entity name
**Example**: "BC-2026" or "TechPro"

### Status Filter
**Location**: Next to search bar
**Options**:
- Tous les statuts (All)
- Brouillon
- Confirmé
- Livré
- Annulé

### Combined Filter
Use both search + status for precise results

## 💡 Action Buttons Explained

| Button | Icon | What It Does |
|--------|------|--------------|
| View | 👁️ | See full document details |
| Edit | ✏️ | Modify document data |
| Delete | 🗑️ | Remove document (ask first) |
| Print | 🖨️ | Generate PDF or print |
| Convert | ➡️ | Create next document type |

## ❌ Deleting Documents

```
1. Find document in list
2. Click Delete button (🗑️)
3. Confirmation dialog appears
4. Click confirm to delete
5. Document removed permanently
Note: No undo, deleted data is lost
```

## 📱 Mobile Usage

- ✅ Fully responsive design
- ✅ Touch-friendly buttons
- ✅ Optimized search dropdowns
- ✅ Table scrolling on small screens
- ✅ Print-to-PDF works on mobile
- ✅ All features accessible on mobile

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | In search, select first result |
| Esc | Close modals/dropdowns |
| Tab | Navigate form fields |
| Arrow Keys | Navigate dropdowns |

## 🐛 Common Issues & Solutions

### Issue: Product not appearing in search
**Solution**: 
- Check spelling
- Ensure stock > 0
- Try reference code instead

### Issue: Can't convert document
**Solution**:
- Verify document status is "Confirmé"
- Ensure has at least 1 product
- Conversion only: BC→BL, BL→BR

### Issue: Print not working
**Solution**:
- Disable popup blocker
- Check browser print settings
- Try Chrome instead

### Issue: Slow search
**Solution**:
- Clear browser cache
- Try more specific search
- Close other tabs

## 📊 Calculations Reference

### Line Item Calculations
```
Total HT = Quantity × Unit Price HT
Total TVA = Total HT × (TVA% / 100)
Total TTC = Total HT + Total TVA
```

### Document Totals
```
Doc Total HT = Sum of all line Total HT
Doc Total TVA = Sum of all line Total TVA
Doc Total TTC = Sum of all line Total TTC
```

### Example
```
Product: Laptop
Quantity: 2
Unit Price HT: 100,000 DA
TVA: 19%

Line Total HT = 2 × 100,000 = 200,000 DA
Line Total TVA = 200,000 × 0.19 = 38,000 DA
Line Total TTC = 200,000 + 38,000 = 238,000 DA
```

## 🎨 Design Colors

### By Document Type
```
BC (Commande)    → Indigo → Blue → Slate
BL (Livraison)   → Emerald → Teal → Cyan
BR (Réception)   → Violet → Purple → Indigo
FP (Proformat)   → Amber → Orange → Rose
```

### UI Elements
```
Primary Actions → Gradient (matching document type)
Secondary → White with border
Disabled → Gray with opacity
Status Badges:
  - Brouillon: Amber
  - Confirmé: Blue
  - Livré: Green
  - Annulé: Red
```

## 📖 Column Headers

### Document Table
| Column | Shows |
|--------|-------|
| N° Document | Document ID with icon |
| Date | Creation date |
| Fournisseur/Client | Entity name & phone |
| Articles | Product line count |
| Statut | Status badge |
| Total TTC | Final amount |
| Actions | View/Edit/Delete/Print buttons |

## ✅ Best Practices

1. **Always confirm before converting**
   - Review document first
   - Ensure status is "Confirmé"

2. **Keep notes updated**
   - Add relevant delivery notes
   - Mark special handling

3. **Regular backups**
   - Export important documents
   - Save PDFs for archive

4. **Status management**
   - Keep BC as "Confirmé" for traceability
   - Move to "Livré" when completed

5. **Search efficiently**
   - Use short keywords
   - Use reference codes if unsure

## 🔐 Data Safety

- ✅ Delete needs confirmation
- ✅ No accidental overwrites
- ✅ Document history preserved (once saved)
- ✅ All calculations verified
- ✅ Totals auto-checked

## 📞 Support

For issues or questions:
1. Check Common Issues section above
2. Review calculation examples
3. Verify document status
4. Check search criteria
5. Try clearing cache

---

**Version**: 1.0.0
**Last Updated**: May 4, 2026
**Language**: French/English interface with French labels
