# Unified Payment Integration - Code Examples

> Copy-paste ready snippets for Clients.tsx and Fournisseurs.tsx

---

## CLIENTS.tsx - PAYMENT MODAL INTEGRATION

### 1. Add Import (at top of file)

```tsx
import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';
```

### 2. Add State (Replace old payment state)

**OLD - REMOVE THESE:**
```tsx
const [payingDebt, setPayingDebt] = useState<any | null>(null);
const [payAmount, setPayAmount] = useState('');
const [payNote, setPayNote] = useState('');
const [saving, setSaving] = useState(false);
```

**NEW - ADD THIS:**
```tsx
const [payingDebt, setPayingDebt] = useState<any | null>(null);
```

### 3. Remove Old Handler

REMOVE the entire `handlePayDebt` function (it's now in the component)

### 4. Replace Modal Render (around line 620-650)

**OLD CODE - FIND AND REPLACE THIS:**
```tsx
{payingDebt && (
  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 space-y-3">
    <h4 className="font-black text-red-700 text-sm">💳 Payer la dette — {payingDebt.invoice_number}</h4>
    <p className="text-xs text-red-600">Reste dû: <strong>{fmt(payingDebt.total_amount - payingDebt.paid_amount)}</strong></p>
    <div className="flex gap-3">
      <input type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)}
        placeholder="Montant"
        className="flex-1 border border-red-300 rounded-xl py-2 px-4 text-sm font-bold focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none" />
      <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note"
        className="flex-1 border border-red-300 rounded-xl py-2 px-4 text-sm focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none" />
    </div>
    <div className="flex gap-3">
      <button onClick={() => { setPayingDebt(null); setPayAmount(''); }}
        className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm">Annuler</button>
      <button onClick={handlePayDebt} disabled={saving}
        className="flex-1 py-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold text-sm disabled:opacity-50">
        {saving ? 'Enregistrement...' : 'Confirmer Paiement'}
      </button>
    </div>
  </div>
)}
```

**NEW CODE - REPLACE WITH THIS:**
```tsx
{payingDebt && (
  <UnifiedPaymentModal
    entityType="client"
    debt={payingDebt}
    entityName={client.name}
    onClose={() => {
      setPayingDebt(null);
    }}
    onPaid={async () => {
      setPayingDebt(null);
      await loadHistory();
    }}
  />
)}
```

---

## FOURNISSEURS.tsx - PAYMENT MODAL INTEGRATION

### 1. Add Import (at top of file)

```tsx
import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';
```

### 2. Add State (Replace old payment state)

**NEW - ADD THIS:**
```tsx
const [payingDebt, setPayingDebt] = useState<any | null>(null);
```

### 3. Remove Old Handler

REMOVE the entire `handlePayDebt` function (it's now in the component)

### 4. Replace Modal Render (around line 706-730)

**OLD CODE - FIND AND REPLACE THIS:**
```tsx
{payingDebt && (
  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 space-y-3">
    <h4 className="font-black text-red-700 text-sm">💳 Payer la dette — {payingDebt.invoice_number}</h4>
    <p className="text-xs text-red-600">Reste dû: <strong>{fmt(payingDebt.total_amount - payingDebt.paid_amount)}</strong></p>
    <div className="flex gap-3">
      <input type="number" min="1" max={payingDebt.total_amount - payingDebt.paid_amount}
        value={payAmount} onChange={e => setPayAmount(e.target.value)}
        placeholder="Montant à payer"
        className="flex-1 border border-red-300 rounded-xl py-2 px-4 text-sm font-bold focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none" />
      <input value={payNote} onChange={e => setPayNote(e.target.value)}
        placeholder="Note (optionnel)"
        className="flex-1 border border-red-300 rounded-xl py-2 px-4 text-sm focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none" />
    </div>
    <div className="flex gap-3">
      <button onClick={() => { setPayingDebt(null); setPayAmount(''); }}
        className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm">Annuler</button>
      <button onClick={handlePayDebt} disabled={saving}
        className="flex-1 py-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-sm shadow-lg disabled:opacity-50">
        {saving ? 'Enregistrement...' : 'Confirmer Paiement'}
      </button>
    </div>
  </div>
)}
```

**NEW CODE - REPLACE WITH THIS:**
```tsx
{payingDebt && (
  <UnifiedPaymentModal
    entityType="supplier"
    debt={payingDebt}
    entityName={supplier.name}
    onClose={() => {
      setPayingDebt(null);
    }}
    onPaid={async () => {
      setPayingDebt(null);
      await loadHistory();
    }}
  />
)}
```

---

## PAYMENT BUTTON - BOTH FILES

The "Payer" button code STAYS THE SAME in both files:

**In Clients.tsx around line 674:**
```tsx
{!isPaid && (
  <button onClick={() => { setPayingDebt(debt); }}
    className="px-3 py-1.5 bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-lg text-xs font-bold shadow">
    Payer
  </button>
)}
```

**In Fournisseurs.tsx around line 760:**
```tsx
{!isPaid && (
  <button onClick={() => { setPayingDebt(debt); }}
    className="px-3 py-1.5 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-lg text-xs font-bold shadow hover:shadow-orange-400/40 transition-all">
    Payer
  </button>
)}
```

---

## VERIFICATION CHECKLIST

Verify these are in your files:

- [ ] **Import statement** at top of file:
  ```tsx
  import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';
  ```

- [ ] **State variable**:
  ```tsx
  const [payingDebt, setPayingDebt] = useState<any | null>(null);
  ```

- [ ] **Modal in JSX** (inside ClientHistoryModal or SupplierHistoryModal):
  ```tsx
  {payingDebt && (
    <UnifiedPaymentModal
      entityType="client" // or "supplier"
      debt={payingDebt}
      entityName={client.name} // or supplier.name
      onClose={() => { setPayingDebt(null); }}
      onPaid={async () => { setPayingDebt(null); await loadHistory(); }}
    />
  )}
  ```

- [ ] **Payer button** in debt list:
  ```tsx
  <button onClick={() => { setPayingDebt(debt); }} ...>Payer</button>
  ```

---

## BEFORE & AFTER

| Aspect | Before | After |
|--------|--------|-------|
| Payment Form | ❌ Old form in each modal | ✅ Unified component |
| Code Duplication | ❌ Duplicate (Clients & Fournisseurs) | ✅ DRY (single source) |
| UI Styling | ❌ Different in each file | ✅ Consistent everywhere |
| Logic | ❌ Manual state management | ✅ Component handles all |
| Maintenance | ❌ Update 2+ places | ✅ Update 1 place |

---

**That's it! Your payment system is now unified and professional! 🎉**
