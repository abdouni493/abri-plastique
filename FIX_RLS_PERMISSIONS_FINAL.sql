/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FIX RLS POLICIES - FINAL VERSION
 * 
 * This version properly handles existing policies by dropping them first.
 * Run this in Supabase SQL Editor if you get "policy already exists" error.
 */

-- ============================================
-- 1. DROP EXISTING POLICIES IF THEY EXIST
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "permissions_manage_admin" ON public.user_permissions CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 2. RECREATE THE PERMISSIONS MANAGE POLICY
-- ============================================

-- Policy: Allow admins to manage permissions
CREATE POLICY "permissions_manage_admin"
ON public.user_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 3. VERIFY POLICY IS CREATED
-- ============================================
SELECT 'Policy Fixed Successfully' AS status;
