# Commercial Documents System - Complete Guide

## Overview

This guide documents the professional commercial document management system implemented for managing:
- **Bons de Commande (BC)** - Purchase Orders from Suppliers
- **Bons de Livraison (BL)** - Delivery Notes to Clients
- **Bons de Réception (BR)** - Reception Notes for Incoming Goods
- **Factures Proformat (FP)** - Proforma Invoices

## System Architecture

### Core Features

#### 1. **Product Search & Selection**
```typescript
// Auto-search products from inventory
// Search by:
- Designation (product name)
- Reference code (REF-001)
- Barcode

// Displays real-time results with:
- Product name and reference
- Current stock quantity
- Unit of measurement
- Price (buying or selling based on context)
- TVA percentage
```

#### 2. **Entity Management**
- **For Bon de Commande**: Search and select Suppliers
- **For Bon de Livraison**: Search and select Clients
- **For Bon de Réception**: Search and select Suppliers (for incoming goods)
- **For Facture Proformat**: Search and select Clients

#### 3. **Line Management**
Each document can contain multiple product lines with:
- Quantity (editable)
- Unit Price HT (editable)
- TVA Percentage (editable - default from product)
- Automatic calculation of:
  - Total HT = Quantity × Unit Price HT
  - Total TTC = Total HT × (1 + TVA/100)

#### 4. **Document Status Workflow**
```
Brouillon (Draft) → Confirmé (Confirmed) → Livré/Reçu (Delivered/Received) → Annulé (Cancelled)
```

#### 5. **Document Conversion Flow**
```
Bon de Commande (Confirmed)
          ↓
        [Convert to]
          ↓
Bon de Livraison (Brouillon)
          ↓
        [Confirm & Convert]
          ↓
Bon de Réception (Brouillon)
```

### Professional UI/UX Design

#### Color Schemes by Document Type
- **Bon de Commande**: Indigo → Blue → Slate (Primary workflow)
- **Bon de Livraison**: Emerald → Teal → Cyan (Delivery process)
- **Bon de Réception**: Violet → Purple → Indigo (Reception process)
- **Facture Proformat**: Amber → Orange → Rose (Sales documents)

#### Key UI Elements
- **Header Card**: Shows document number, title, and status badge
- **Stats Card**: Total TTC amount with document count and confirmed count
- **Status Distribution**: Visual pie chart by status
- **Search & Filter**: By document number, entity name, and status
- **Action Buttons**: View, Edit, Delete, Print, Convert
- **Print Templates**: Professional PDF output with company header

## File Structure

```
src/pages/
├── BonCommande.tsx          # Main component supporting all 4 types
├── BonLivraison.tsx         # Re-exports from BonCommande (type: livraison)
├── BonReception.tsx         # Re-exports from BonCommande (type: reception)
└── FactureProformat.tsx     # Re-exports from BonCommande (type: proformat)

src/types.ts                 # BonCommande interface and related types
```

## Component Structure

### Main Components

#### 1. **CommercialDocList**
Generic list component supporting all 4 document types.

**Key Features:**
- Filtered table with search and status filter
- Statistics dashboard
- CRUD operations
- Document conversion trigger
- Print functionality

**Props:**
```typescript
interface CommercialDocListProps {
  type: 'commande' | 'livraison' | 'reception' | 'proformat';
}
```

#### 2. **BonForm**
Modal form for creating and editing documents.

**Features:**
- Auto-populate from conversion source
- Search-based product selection
- Editable line items
- Quantity, price, and TVA management
- Client/Supplier selection
- Date management
- Notes/remarks field

**Props:**
```typescript
interface BonFormProps {
  type: 'commande' | 'livraison' | 'reception' | 'proformat';
  bon?: BonCommande;                    // For editing existing
  conversionSource?: BonCommande;       // For converting from another type
  onClose: () => void;
  onSave: (b: BonCommande) => void;
}
```

#### 3. **ViewModal**
Read-only detailed view of a document with print and convert options.

**Features:**
- Display all document details
- Show entity information
- Display line items in table format
- Totals calculation display
- Print button
- Convert button (if applicable)
- Show remarks

#### 4. **ProductSearch**
Auto-complete search component for product selection.

**Search Capabilities:**
- By designation (name)
- By reference code
- By barcode
- Real-time filtering
- Display current stock

#### 5. **EntitySearch**
Auto-complete search component for client/supplier selection.

**Features:**
- Search by name
- Display contact information
- Show wilaya (province)
- Single selection

### Sub-Components

#### Print Functions
- `printBon()` - Generates professional PDF with:
  - Company header
  - Document metadata
  - Entity information
  - Line items table
  - Totals
  - Signatures area

## Data Model

### BonCommande Interface
```typescript
interface BonCommande {
  id: string;
  numero: string;
  date: string;
  datelivraison: string;
  supplier: Supplier | null;        // For BC and BR
  client: Client | null;            // For BL and FP
  lines: BonLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  status: 'brouillon' | 'confirme' | 'livre' | 'annule';
  notes: string;
  paymentMode: 'especes' | 'virement' | 'cheque' | 'traite';
}

interface BonLine {
  id: string;
  product: Product;
  quantity: number;
  prixUnitHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
}

interface Product {
  id: string;
  designation: string;
  refProduct: string;
  barCode: string;
  prixAchatHT: number;
  prixVente: number;
  tva: number;
  currentQuantity: number;
  uniteMesure: string;
  famille: string;
}
```

## Usage Workflow

### Creating a New Bon de Commande

1. Navigate to **Bons de Commande** page
2. Click **"Nouveau Bon"** button
3. Fill in the form:
   - Document reference (auto-generated)
   - Date (default today)
   - Supplier search and selection
   - Payment mode
   - Product search and add items
   - Edit quantities and prices as needed
   - Add remarks/notes
4. Set status to "Brouillon" or "Confirmé"
5. Click **"Créer le document"**

### Converting to Bon de Livraison

1. Open a **Confirmed** Bon de Commande
2. Click **"Convertir en BL"** button
3. A new Bon de Livraison form opens pre-populated with:
   - Same products and quantities
   - Same dates
   - Same notes
   - New BL number
   - Client field (to be filled from supplier contact)
4. Modify as needed
5. Save as new Bon de Livraison

### Converting to Bon de Réception

1. Open a **Confirmed** Bon de Livraison
2. Click **"Convertir en BR"** button
3. A new Bon de Réception form opens with:
   - Same line items
   - Same quantities
   - New BR number
   - Status reset to "Brouillon"
4. Confirm received quantities (can be different)
5. Save as Bon de Réception

## Action Buttons Explained

| Button | Icon | Action |
|--------|------|--------|
| View | 👁️ Eye | Open detailed view modal |
| Edit | ✏️ Pencil | Open edit form with current data |
| Delete | 🗑️ Trash | Remove document (with confirmation) |
| Print | 🖨️ Printer | Generate and print PDF |
| Convert* | ➡️ Arrow | Convert to next type (if confirmed) |

*Convert button only appears on:
- Confirmed Bon de Commande → Convert to Bon de Livraison
- Confirmed Bon de Livraison → Convert to Bon de Réception

## Search & Filter Features

### Product Search
- **Real-time filtering** as you type
- **Multi-field search**: designation, reference, barcode
- **Stock information** displayed
- **Price information** shown
- **Pagination**: Shows top 6 results

### Entity Search (Supplier/Client)
- **Auto-complete** by name
- **Contact information** displayed
- **Wilaya** (province) shown
- **Single selection** model

### Table Filtering
- **Full text search** on document number and entity name
- **Status filter**: All, Brouillon, Confirmé, Livré, Annulé
- **Responsive**: Works on mobile and desktop

## Statistics Dashboard

### Key Metrics
- **Total TTC Amount**: Sum of all confirmed documents
- **Total Documents**: Count of all documents of this type
- **Confirmed**: Count of confirmed documents only
- **Status Distribution**: Pie chart showing breakdown by status

## Print Template

### Print Features
- **Professional header** with company logo area
- **Document type** prominently displayed
- **Document number** and dates
- **Entity information** (Supplier/Client) with contact details
- **Itemized line items** table with:
  - Item number
  - Product designation
  - Quantity and unit
  - Unit price HT
  - TVA percentage
  - Total amounts
- **Totals section**:
  - Total HT
  - Total TVA
  - Total TTC (highlighted)
- **Notes/Remarks** section
- **Signature area** with 3 signature lines
- **Optimized for printing** with proper spacing and colors

## Styling & Design System

### Colors Used
- **Indigo/Purple**: Primary (used for BC)
- **Emerald/Teal/Cyan**: Secondary (used for BL)
- **Violet/Purple**: Tertiary (used for BR)
- **Amber/Orange**: Accent (used for FP)
- **Gray**: Neutral backgrounds and text

### Typography
- **Headings**: Bold, large font (18-48px)
- **Body**: Regular medium font (12-16px)
- **Captions**: Smaller, muted (10-12px)
- **Font**: Segoe UI, Arial (for printing)

### Spacing
- **Padding**: 4px, 8px, 12px, 16px, 24px, 32px
- **Margin**: Consistent spacing throughout
- **Border radius**: 8px, 11px, 20px, 24px

### Animations
- **Entrance**: Fade in + scale
- **Hover states**: Smooth color transitions
- **Transitions**: 200ms-300ms duration
- **Spring animations**: For progress bars and status updates

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Responsive design, tested on iOS/Android

## Performance Considerations

### Optimizations
- **Lazy loading**: Modal components load on demand
- **Memoization**: Search results cached
- **Virtualization**: Large tables handled efficiently
- **Debouncing**: Search input debounced

### Data Management
- **Local state**: Component state management with React hooks
- **localStorage**: Optional persistence (to be integrated)
- **Real-time calculation**: Totals recalculated on line changes

## Integration Points

### AppContext Integration
Documents can be persisted to:
- `appContext.addBon()`
- `appContext.deleteBon()`
- `appContext.updateBon()`

### Product Selection
Products fetched from:
- `MOCK_PRODUCTS` (mock data)
- Can be connected to: `appContext.products`

### Entity Selection
Entities fetched from:
- `MOCK_SUPPLIERS` / `MOCK_CLIENTS` (mock data)
- Can be connected to: `appContext.suppliers` / `appContext.clients`

## Future Enhancements

1. **Email Integration**: Send documents via email
2. **Multi-currency**: Support for different currencies
3. **Tax Variants**: More tax calculation options
4. **Batch Operations**: Bulk edit/delete
5. **Export Formats**: Excel, CSV export options
6. **Document Templates**: Custom header/footer
7. **Discounts**: Line-level and document-level discounts
8. **Approval Workflow**: Multi-level approvals
9. **Audit Trail**: Track all changes
10. **Recurring Documents**: Auto-generate based on schedule

## Troubleshooting

### Product Not Appearing
- Check product name/reference spelling
- Ensure product has stock quantity > 0
- Verify barcode format if using barcode search

### Conversion Not Available
- Ensure source document status is "Confirmé"
- Only BC→BL and BL→BR conversions are available
- Check document has at least one product line

### Print Issues
- Ensure popup blocker is disabled
- Check browser print settings
- For mobile, use browser's print option

### Search Slow
- Clear browser cache
- Check product database size
- Try more specific search terms

## API Reference

### Document Workflow Functions

#### Create Document
```typescript
const newBon: BonCommande = {
  id: genId(),
  numero: genNumero(type),
  date: new Date().toISOString().split('T')[0],
  // ... other fields
};
handleSave(newBon);
```

#### Update Document
```typescript
const updated = { ...bon, status: 'confirme', notes: 'Updated' };
handleSave(updated);
```

#### Delete Document
```typescript
handleDelete(bon.id);
```

#### Convert Document
```typescript
handleConvert(sourceBon); // Initiates conversion workflow
```

#### Print Document
```typescript
printBon(bon, TITLE_MAP[type], SUBTITLE_MAP[type]);
```

## License
SPDX-License-Identifier: Apache-2.0

---

**Last Updated**: May 4, 2026
**Version**: 1.0.0
**Status**: Production Ready
