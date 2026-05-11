# Supabase Storage Buckets Setup Guide

## Overview
This document provides the SQL and RLS configuration needed to set up the file storage buckets for the Entreprise Cash Flow application. Supabase Storage buckets must be manually created through the Supabase Dashboard or via SQL.

---

## Storage Buckets Required

The application uses three storage buckets:

1. **`logos`** - Company logos and images (PUBLIC)
   - Used in: `src/pages/Parametres.tsx` (logo upload)
   - Access: Public read (no auth required), write restricted to authenticated users
   - Files: PNG, JPG, SVG logos

2. **`justificatifs`** - Support documents and receipts (PRIVATE)
   - Used in: Document pages (Ventes, Achats, BonCommande, etc.)
   - Access: Auth-only (authenticated users only)
   - Files: PDF, images of receipts and invoices

3. **`products`** - Product images (PUBLIC)
   - Used in: Inventory management (Inventaire.tsx)
   - Access: Public read, write restricted to authenticated users
   - Files: Product photos and images

---

## Setup via Supabase Dashboard

### Step 1: Create Storage Buckets

1. Log in to your Supabase Project Dashboard
2. Navigate to **Storage** (left sidebar)
3. Click **Create a new bucket**
4. Create three buckets with these settings:

#### Bucket 1: `logos`
- **Bucket name:** `logos`
- **Public bucket:** ✅ YES (toggle ON)
- **File size limit:** 5 MB
- Click **Create bucket**

#### Bucket 2: `justificatifs`
- **Bucket name:** `justificatifs`
- **Public bucket:** ❌ NO (toggle OFF)
- **File size limit:** 10 MB
- Click **Create bucket**

#### Bucket 3: `products`
- **Bucket name:** `products`
- **Public bucket:** ✅ YES (toggle ON)
- **File size limit:** 5 MB
- Click **Create bucket**

---

## Setup via SQL (Advanced)

If you prefer to create buckets via SQL, run the following commands in your Supabase SQL Editor:

### Create Buckets

```sql
-- Create logos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Create justificatifs bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justificatifs',
  'justificatifs',
  false,
  10485760, -- 10 MB in bytes
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
);

-- Create products bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);
```

---

## RLS Policies Configuration

After creating the buckets, set up Row Level Security (RLS) policies for proper access control.

### Logos Bucket RLS Policies

```sql
-- Allow public read access to logos
CREATE POLICY "Allow public read logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update/delete their own logos
CREATE POLICY "Allow update delete logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'logos' 
  AND auth.role() = 'authenticated'
);
```

### Justificatifs Bucket RLS Policies

```sql
-- Allow authenticated users to read justificatifs
CREATE POLICY "Allow authenticated read justificatifs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'justificatifs' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload justificatifs
CREATE POLICY "Allow authenticated upload justificatifs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'justificatifs' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update/delete justificatifs
CREATE POLICY "Allow authenticated update justificatifs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'justificatifs' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'justificatifs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated delete justificatifs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'justificatifs' 
  AND auth.role() = 'authenticated'
);
```

### Products Bucket RLS Policies

```sql
-- Allow public read access to products
CREATE POLICY "Allow public read products"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Allow authenticated users to upload products
CREATE POLICY "Allow authenticated upload products"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update/delete products
CREATE POLICY "Allow authenticated update products"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated delete products"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);
```

---

## Upload Functions in Application

The application provides upload utilities in `src/lib/storage.ts`:

```typescript
// Upload logo to 'logos' bucket
await uploadLogo(file: File) -> Promise<string>
// Returns public URL of uploaded file

// Upload justificatif to 'justificatifs' bucket  
await uploadJustificatif(file: File) -> Promise<string>
// Returns URL of uploaded file

// Upload product image to 'products' bucket
await uploadProductImage(file: File) -> Promise<string>
// Returns public URL of uploaded file
```

---

## Troubleshooting

### Issue: "Bucket does not exist" error

**Solution:** Create the bucket using the Supabase Dashboard or SQL commands above.

### Issue: "Permission denied" error

**Solution:** Check that RLS policies are properly configured and the user is authenticated (for private buckets).

### Issue: Public URLs return 404

**Solution:** Ensure the bucket is marked as public in the dashboard, and files are uploaded with proper permissions.

### Issue: Files uploaded but not accessible

**Solution:** Verify the RLS policies allow `SELECT` access for your user role.

---

## Testing Uploads

After setup, test the upload functionality:

1. Navigate to **Settings** (Parametres) page
2. Click "Upload Logo" in the General tab
3. Select a PNG/JPG file
4. Verify the file uploads successfully and displays

---

## Storage URLs

Once configured, files are accessible at:

- **Public buckets:** `https://<project-url>/storage/v1/object/public/{bucket}/{filename}`
- **Private buckets:** `https://<project-url>/storage/v1/object/authenticated/{bucket}/{filename}` (requires auth token)

The application automatically generates these URLs when uploading files.

---

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security)
- [File Upload Examples](https://supabase.com/docs/guides/storage/uploads)
