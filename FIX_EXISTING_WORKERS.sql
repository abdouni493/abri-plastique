/**
 * FIX EXISTING WORKERS
 * 
 * Run this in Supabase SQL Editor to fix worker accounts that cannot login.
 * This script adds missing identities and app metadata to auth.users.
 */

-- 1. Update app metadata for all users missing it
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
WHERE raw_app_meta_data IS NULL OR raw_app_meta_data = '{}'::jsonb;

-- 2. Create missing identities for users
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    format('{"sub":"%s","email":"%s"}', u.id::text, u.email)::jsonb,
    'email',
    NOW(),
    u.created_at,
    u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

SELECT 'Workers fixed successfully!' as status;
