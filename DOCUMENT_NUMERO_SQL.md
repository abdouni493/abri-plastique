# Document Numero Generation SQL

## Overview
This SQL function enables sequential document number generation using the `document_sequences` table, replacing the unsafe `Date.now()` approach.

## Installation

Run this SQL in your **Supabase Dashboard > SQL Editor**:

```sql
-- Create table for document sequences if it doesn't exist
CREATE TABLE IF NOT EXISTS public.document_sequences (
  id bigserial PRIMARY KEY,
  doc_type text NOT NULL UNIQUE,
  prefix text NOT NULL,
  last_seq integer NOT NULL DEFAULT 0,
  year integer NOT NULL DEFAULT 2024,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create RLS policy for authenticated users
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access_document_sequences"
ON public.document_sequences
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create the RPC function for generating next document number
CREATE OR REPLACE FUNCTION public.next_document_number(
  p_doc_type text, 
  p_prefix text, 
  p_year int
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO public.document_sequences (doc_type, prefix, last_seq, year)
  VALUES (p_doc_type, p_prefix, 1, p_year)
  ON CONFLICT (doc_type) DO UPDATE SET last_seq = document_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  
  RETURN p_prefix || '-' || p_year || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;
```

## Usage

The frontend code now calls this function:

```typescript
const numero = await generateNumero('VNT', 'vente');  // Returns: VNT-2026-0001, VNT-2026-0002, etc.
const numero = await generateNumero('ACH', 'achat');  // Returns: ACH-2026-0001, ACH-2026-0002, etc.
```

## Format

- **Ventes**: `VNT-2026-0001`, `VNT-2026-0002`, etc.
- **Achats**: `ACH-2026-0001`, `ACH-2026-0002`, etc.

## Benefits

✅ **Sequential numbering** — Documents are numbered in order
✅ **Conflict-free** — PostgreSQL UPSERT ensures no duplicates
✅ **Year-aware** — Prefix includes year
✅ **Transactional** — Safe under concurrent load
✅ **Fallback** — Frontend falls back to timestamp if RPC unavailable
