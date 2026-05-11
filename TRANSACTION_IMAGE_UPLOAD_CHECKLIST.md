# Quick Checklist: Transaction Image Upload Setup

## Before First Use

- [ ] Supabase `justificatifs` bucket exists (private)
- [ ] RLS policies allow authenticated users to upload
- [ ] RLS policies allow authenticated users to read
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
- [ ] Dev server running: `npm run dev`
- [ ] Logged in to the application

## Testing the Feature

### Test 1: Upload Image
1. Go to **Caisse** page
2. Click **New Transaction**
3. Fill in form:
   - Amount: 1000
   - Type: In
   - Category: Vente Marchandise
   - Date: Today
   - Description: "Test transaction"
4. Click upload area
5. Select image file (JPG/PNG)
6. ✅ Filename shows with checkmark
7. Click **Save**
8. ✅ Image uploads (indicator shows)
9. ✅ Modal closes

### Test 2: View Uploaded Image
1. Find transaction in Caisse list
2. Click info icon (View Details)
3. ✅ Image displays in modal

### Test 3: Database Verification
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run query:
```sql
SELECT id, amount, category, date, proof_url 
FROM public.transactions 
WHERE source = 'caisse' 
AND proof_url IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```
4. ✅ `proof_url` column has URL starting with `https://`

### Test 4: Storage Verification
1. Open Supabase Dashboard
2. Go to Storage
3. Click `justificatifs` bucket
4. ✅ Files visible in `caisse/` folder with timestamps

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Upload fails silently | Bucket doesn't exist | Create `justificatifs` bucket |
| "Error uploading justificatif" | RLS policy missing | Add upload policy to bucket |
| Image shows but URL is null | Proof not saved | Check AppContext addTransaction() |
| Upload button stuck | Network issue | Refresh page, check console |
| Auth required error | Not logged in | Log in to application |

## Configuration Files

### .env
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_key
```

### src/lib/storage.ts
- Upload function: ✅ Already configured
- Folder structure: Uses `caisse` subfolder

### src/pages/Caisse.tsx
- File upload handler: ✅ Shows filename
- Error display: ✅ Shows error messages
- Upload state: ✅ Disables button while uploading

## Monitoring

### Check Recent Uploads
```sql
SELECT 
  t.id,
  t.amount,
  t.category,
  t.proof_url,
  t.created_at
FROM public.transactions t
WHERE t.source = 'caisse'
  AND t.proof_url IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 10;
```

### Check Failed Uploads
```sql
SELECT 
  t.id,
  t.amount,
  t.category,
  t.created_at
FROM public.transactions t
WHERE t.source = 'caisse'
  AND t.proof_url IS NULL
  AND t.created_at > NOW() - INTERVAL '1 day'
ORDER BY t.created_at DESC;
```

### Storage Usage
In Supabase Dashboard:
- Storage > justificatifs > Check file count
- Verify files named with format: `caisse/[timestamp]-[filename]`

## Next Steps

1. ✅ Run tests above
2. ✅ Monitor first 10 uploads
3. ✅ Check database and storage
4. ✅ Verify image display in details modal
5. Create backup of database if in production

