# Transaction Image Upload - Quick Reference

## What Works Now ✅

| Feature | Status | Location |
|---------|--------|----------|
| Upload images to Caisse form | ✅ Working | Caisse.tsx |
| Save URL to database | ✅ Working | AppContext.tsx |
| Show filename after selection | ✅ New | Caisse.tsx |
| Error messages | ✅ New | Caisse.tsx |
| View image in details modal | ✅ Working | Caisse.tsx |
| Automatic form reset | ✅ New | Caisse.tsx |

---

## Setup Checklist

```bash
# 1. Verify Supabase bucket exists
Supabase Dashboard > Storage > justificatifs (should show Private)

# 2. Verify environment variables
cat .env | grep VITE_SUPABASE

# 3. Restart dev server
npm run dev

# 4. Test workflow
# Navigate to Caisse > New Transaction > Upload image
```

---

## Quick Test

```
1. Go to Caisse page
2. Click "New Transaction"
3. Fill amount: 1000
4. Upload image
5. See filename with ✓
6. Click Save
7. Success: Modal closes
8. Verify: Click info icon → image shows
```

---

## Code Changes Summary

### Before
```typescript
<input type="file" onChange={(e) => setFormData(...)} />
```

### After
```typescript
<input 
  type="file" 
  onChange={(e) => {
    setFormData({...formData, attachment: e.target.files?.[0]});
    setUploadedFileName(e.target.files?.[0]?.name);
  }} 
/>
{uploadedFileName && <p className="text-emerald-600">✓ {uploadedFileName}</p>}
{uploadError && <div className="bg-red-50 p-3">{uploadError}</div>}
```

---

## Database Check

```sql
-- Verify images are saving
SELECT id, amount, proof_url, created_at 
FROM transactions 
WHERE source = 'caisse' 
AND proof_url IS NOT NULL 
LIMIT 5;
```

Expected output:
```
id                    | amount | proof_url                                      | created_at
---------------------|--------|------------------------------------------------|---
abc-123...            | 1000   | https://...supabase.co/...caisse/1234567-...  | 2024-05-05...
```

---

## Files Modified

| File | Changes | Impact |
|------|---------|--------|
| src/pages/Caisse.tsx | Added upload feedback, error handling, form reset | UX improvement |
| No other files | All existing infrastructure used | Clean implementation |

---

## Storage Structure

```
Supabase Storage (justificatifs bucket)
├── caisse/
│   ├── 1715928000000-receipt.jpg
│   ├── 1715928001234-invoice.pdf
│   └── 1715928002567-document.png
├── banque/
└── autres/
```

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key
```

---

## RLS Policies (SQL)

Run in Supabase SQL Editor:

```sql
-- Upload policy
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'justificatifs');

-- Read policy
CREATE POLICY "Authenticated users can read"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'justificatifs');
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Upload fails | Check bucket exists and is Private |
| Image not in DB | Check RLS policies |
| "Error uploading" | Verify `.env` variables |
| Stuck upload | Refresh page |

---

## API Used

### uploadJustificatif()
```typescript
const url = await uploadJustificatif(file, 'caisse');
// Returns: "https://...supabase.co/..." or null
```

### Database Fields
```typescript
// Caisse.tsx form
proof: url // ← Passed to addTransaction()

// AppContext.tsx
proof_url: t.proof || null // ← Saved to DB
```

---

## Next Steps

1. ✅ Create `justificatifs` bucket
2. ✅ Add RLS policies
3. ✅ Verify `.env`
4. ✅ Test upload
5. ✅ Check database
6. ✅ Verify image display

---

## Docs

- Full guide: `TRANSACTION_IMAGE_UPLOAD_GUIDE.md`
- Setup & test: `TRANSACTION_IMAGE_UPLOAD_CHECKLIST.md`
- Implementation: `TRANSACTION_IMAGE_UPLOAD_IMPLEMENTATION.md`

