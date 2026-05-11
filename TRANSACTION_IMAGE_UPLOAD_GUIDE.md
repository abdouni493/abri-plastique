# Transaction Image Upload Configuration Guide

## Overview
The Caisse (Cash) transaction creation form now supports automatic image upload to Supabase Storage with URL persistence in the database. This guide explains the setup, flow, and testing.

---

## Architecture

### Data Flow
```
1. User selects image in Caisse form
   ↓
2. React state stores File object
   ↓
3. User submits form
   ↓
4. uploadJustificatif() uploads to Storage bucket
   ↓
5. Returns public URL
   ↓
6. addTransaction() saves URL to proof_url field
   ↓
7. Transaction stored with image reference
   ↓
8. Image displayed in View Details modal
```

### Database Schema
The `transactions` table stores images as URLs:
```sql
CREATE TABLE public.transactions (
  id uuid NOT NULL,
  amount numeric NOT NULL,
  type user-defined, -- 'in' or 'out'
  category text NOT NULL,
  date date NOT NULL,
  description text,
  proof_url text,  -- URL to image in Supabase Storage
  source user-defined, -- 'caisse', 'banque', etc
  -- ... other fields
);
```

### Storage Bucket
- **Bucket name:** `justificatifs`
- **Visibility:** Private (requires authentication)
- **Folder structure:** `caisse/` subfolder for transaction images
- **File naming:** `caisse/{timestamp}-{filename}.{ext}`

---

## Implementation

### 1. Storage Upload Function
**File:** `src/lib/storage.ts`

```typescript
export const uploadJustificatif = async (
  file: File,
  folder?: string
): Promise<string | null> => {
  try {
    const folderName = folder || 'transactions';
    const path = `${folderName}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from('justificatifs')
      .upload(path, file);

    if (error) {
      console.error('Error uploading justificatif:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('justificatifs')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading justificatif:', err);
    return null;
  }
};
```

**Features:**
- ✅ Automatic timestamp prefixing to prevent naming conflicts
- ✅ Organized by folder (caisse, banque, etc)
- ✅ Error handling with null return
- ✅ Returns public URL immediately

### 2. Caisse Form Integration
**File:** `src/pages/Caisse.tsx`

#### Form State
```typescript
const [formData, setFormData] = useState({
  // ... other fields
  attachment: null as any,  // File object
});
const [uploadError, setUploadError] = useState<string | null>(null);
const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
```

#### File Selection
```typescript
<input 
  type="file" 
  onChange={(e) => {
    if (e.target.files?.[0]) {
      setFormData({...formData, attachment: e.target.files[0]});
      setUploadedFileName(e.target.files[0].name);
      setUploadError(null);
    }
  }} 
/>
```

**Features:**
- ✅ Shows selected filename immediately
- ✅ Clears any previous upload errors
- ✅ Visual feedback with checkmark

#### Form Submission
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setUploadingFile(true);
  setUploadError(null);
  
  try {
    let proofUrl: string | null = null;
    if (formData.attachment) {
      // Upload to storage
      proofUrl = await uploadJustificatif(formData.attachment, 'caisse');
      if (!proofUrl) {
        setUploadError('Error uploading file');
        setUploadingFile(false);
        return;
      }
    }
    
    // Save transaction with proof URL
    const data = {
      // ... other fields
      proof: proofUrl || undefined,
    };
    
    await addTransaction(data);
    
    // Reset form
    setShowModal(false);
    setUploadedFileName(null);
    // ... reset other fields
  } catch (err) {
    setUploadError('Error submitting transaction');
    setUploadingFile(false);
  }
};
```

**Features:**
- ✅ Error handling if upload fails
- ✅ User-friendly error messages
- ✅ Prevents submission without successful upload
- ✅ Complete form reset after success

### 3. Database Persistence
**File:** `src/context/AppContext.tsx`

```typescript
const addTransaction = async (t: Omit<Transaction, 'id'>) => {
  try {
    const { data } = await supabase.from('transactions').insert({
      // ... other fields
      proof_url: t.proof || null,  // Save URL to database
    }).select().single();
    
    setTransactions(prev => [mapTransaction(data), ...prev]);
  } catch (err) {
    console.error('Error adding transaction:', err);
  }
};
```

**Features:**
- ✅ `t.proof` maps to `proof_url` column
- ✅ Null-safe (optional image)
- ✅ Transaction fetched immediately

### 4. Image Display
**File:** `src/pages/Caisse.tsx` (View Details Modal)

```typescript
{showViewModal.proof && (
  <div className="col-span-2">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
      Justificatif
    </p>
    <img 
      src={showViewModal.proof} 
      className="w-full rounded-xl border border-gray-100 shadow-sm" 
      alt="Justificatif" 
    />
  </div>
)}
```

**Features:**
- ✅ Only shows if image exists
- ✅ Full-width responsive display
- ✅ Styled with border and shadow

---

## Setup Instructions

### Step 1: Verify Storage Bucket

1. Log in to **Supabase Dashboard**
2. Navigate to **Storage**
3. Verify `justificatifs` bucket exists
   - If missing, click **Create bucket**
   - Name: `justificatifs`
   - Public: ❌ No (private)
   - Size limit: 10 MB

### Step 2: Configure RLS Policies

In Supabase Dashboard, go to **Storage** → **Buckets** → **justificatifs** → **Policies**:

Add this policy for authenticated users to upload:
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload justificatifs"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'justificatifs'
  AND auth.role() = 'authenticated'
);
```

Add this policy for authenticated users to read:
```sql
-- Allow authenticated users to read justificatifs
CREATE POLICY "Authenticated users can read justificatifs"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'justificatifs');
```

### Step 3: Update Supabase URL (if needed)

In `src/lib/supabase.ts`:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
```

### Step 4: Restart Development Server

```bash
npm run dev
```

---

## Usage

### Creating Transaction with Image

1. Click **New Transaction** button in Caisse page
2. Fill in:
   - Amount (required)
   - Type (In/Out)
   - Category
   - Date
   - Description
3. Click dashed box to upload justificatif
   - Select image file (JPG, PNG, PDF)
   - Filename appears with ✓ checkmark
4. Click **Save**
   - Upload indicator shows
   - Image uploads to Storage
   - URL saved to database
   - Modal closes

### Viewing Transaction Image

1. Click **View Details** (info icon) on any transaction
2. Scroll to **Justificatif** section
3. Image displays at full width

### Editing Transaction with New Image

1. Click **Edit** (pencil icon) on transaction
2. Upload new image (replaces old URL)
3. Click **Save**

---

## Troubleshooting

### Upload Fails: "Error uploading justificatif"
**Cause:** File size too large or bucket doesn't exist

**Solution:**
- Check file size < 10 MB
- Verify `justificatifs` bucket exists in Supabase
- Check storage policies

### Image Won't Display
**Cause:** URL not saved to database

**Solution:**
- Check `proof_url` field in database
- Verify RLS policy allows reading
- Check browser DevTools Network tab

### No Error But Image Doesn't Upload
**Cause:** Network issue or auth token expired

**Solution:**
- Refresh page (re-authenticate)
- Check browser console for errors
- Verify internet connection

### "Upload..." Button Stuck
**Cause:** Upload hung or network timeout

**Solution:**
- Wait 30 seconds then refresh
- Check browser DevTools Network tab
- Verify Supabase status

---

## File Size Limits

| Bucket | Max Size | Type | Example |
|--------|----------|------|---------|
| justificatifs | 10 MB | PDF, JPG, PNG | Receipts, invoices |
| logos | 5 MB | PNG, JPG, SVG | Company logos |
| products | 5 MB | JPG, PNG | Product photos |

---

## Image URL Format

Uploaded images use this URL format:
```
https://[project-id].supabase.co/storage/v1/object/authenticated/justificatifs/caisse/[timestamp]-[filename].[ext]
```

Example:
```
https://atxoupjkwoltgwlbhkih.supabase.co/storage/v1/object/authenticated/justificatifs/caisse/1715928000000-receipt.jpg
```

---

## Security Considerations

1. **Private Bucket:** `justificatifs` is private (requires auth)
2. **RLS Policies:** Only authenticated users can upload/read
3. **Timestamp Prefixing:** Prevents filename conflicts
4. **Error Handling:** Failed uploads don't create transactions

---

## API Reference

### uploadJustificatif()
```typescript
export const uploadJustificatif = async (
  file: File,
  folder?: string
): Promise<string | null>
```

**Parameters:**
- `file`: File object from input
- `folder`: Optional subfolder (default: 'transactions')

**Returns:**
- `string`: Public URL if successful
- `null`: If upload failed

**Usage:**
```typescript
const url = await uploadJustificatif(file, 'caisse');
if (url) {
  // URL is ready to save
}
```

---

## Future Enhancements

- [ ] Image preview before upload
- [ ] Multiple images per transaction
- [ ] Image compression/optimization
- [ ] Drag & drop upload
- [ ] Attachment deletion
- [ ] Archive old images

---

## Related Files

- `src/pages/Caisse.tsx` - Transaction form
- `src/lib/storage.ts` - Upload functions
- `src/context/AppContext.tsx` - Database operations
- `STORAGE_BUCKETS_SETUP.md` - Storage setup guide

