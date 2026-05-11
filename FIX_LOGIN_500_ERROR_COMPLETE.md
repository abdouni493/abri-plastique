# 🔧 FIX: "Database error querying schema" - Login 500 Error

## Problem
When creating a user manually via Supabase UI (or SQL) and trying to login, you get:
```
POST https://atxoupjkwoltgwlbhkih.supabase.co/auth/v1/token?grant_type=password 500 (Internal Server Error)
Message: Database error querying schema
```

## Root Cause
The `auth.users` record exists, but:
1. The `public.users` record is missing or improperly linked
2. RLS policies are failing during login because they can't find the user in `public.users`
3. Supabase tries to query user metadata/schema and fails due to missing record

## Solution: Auto-Create Users Through Application

Instead of manually creating users in Supabase, use your application's **Utilisateurs** page which calls the `create_worker_account()` RPC function that:
1. ✅ Creates auth.users record
2. ✅ Creates public.users record (linked via auth_user_id)
3. ✅ Sets up permissions automatically
4. ✅ Returns the auth_user_id for reference

---

## How to Use (Recommended Flow)

### Step 1: Go to Utilisateurs Page
Navigate to **Utilisateurs** → Click **"Nouveau Membre"** button

### Step 2: Fill the Form
```
Nom Complet:        Administrator
Nom d'Utilisateur:  admin
Email:              admin@admin.com
Mot de Passe:       YourSecurePassword123
Poste:              admin (or worker)
Téléphone:          (optional)
```

### Step 3: Click "Créer l'utilisateur"
The form will:
1. Call `supabase.rpc('create_worker_account', {...})`
2. Backend creates BOTH auth.users and public.users records
3. Response includes the new auth_user_id
4. User can immediately login

### Step 4: User Can Login
The created user can now login with:
- Email: admin@admin.com
- Password: YourSecurePassword123

---

## Alternative: If You Need to Fix Existing Users

If you manually created users in Supabase and can't login, run this SQL to fix them:

### Option A: Delete and Recreate
```sql
-- 1. Delete the problematic user from auth
DELETE FROM auth.users WHERE email = 'admin@admin.com';

-- 2. Use the app to recreate them through Utilisateurs page
```

### Option B: Link Existing Auth User to Public Users
```sql
-- If you have an existing auth.users record but no public.users record:

INSERT INTO public.users (
  id,
  name,
  username,
  email,
  role,
  status,
  auth_user_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),                    -- New record ID
  'Administrator',
  'admin',
  'admin@admin.com',
  'admin'::user_role,
  'active'::user_status,
  'c7688b9c-fde3-455a-9f59-42d05cf6acf2',  -- The auth.users UUID
  now(),
  now()
);

-- Then grant permissions
INSERT INTO public.user_permissions (
  user_id,
  permission_key,
  granted
)
SELECT 
  u.id,
  'view_all_interfaces',
  true
FROM public.users u
WHERE u.email = 'admin@admin.com';
```

---

## Verify the Fix

### Check if User Can Login
1. Go to Login page
2. Enter email: admin@admin.com
3. Enter password: YourSecurePassword123
4. Click Login

✅ **Success**: Dashboard loads, user logged in
❌ **Still failing**: Check the troubleshooting section below

### Check Database Records
Run this in Supabase SQL Editor:

```sql
-- Check if auth user exists
SELECT id, email FROM auth.users WHERE email = 'admin@admin.com';

-- Check if public user exists
SELECT id, email, auth_user_id, role FROM public.users WHERE email = 'admin@admin.com';

-- Check if linked properly
SELECT 
  pu.email,
  pu.role,
  au.email as auth_email
FROM public.users pu
LEFT JOIN auth.users au ON pu.auth_user_id = au.id
WHERE pu.email = 'admin@admin.com';
```

Expected output:
```
 email             | role  | auth_email
─────────────────────────────────────
 admin@admin.com   | admin | admin@admin.com
```

---

## Troubleshooting

### Still Getting "Database error querying schema"?

**1. Check RLS Policies**
```sql
-- Verify RLS is enabled on public.users
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';
```

Should return: `rowsecurity = true`

**2. Check Profiles Table (if it exists)**
Some Supabase templates have a `profiles` table. Verify if you need it:
```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- If it exists and is causing issues, check if there's a user_id mismatch
SELECT id, email FROM public.profiles WHERE email = 'admin@admin.com';
```

**3. Check User Permissions**
```sql
-- Verify user has view permission for public schema
SELECT * FROM public.user_permissions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'admin@admin.com');
```

**4. Check Function Logs** (if using RPC)
```sql
-- Check if create_worker_account function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'create_worker_account'
AND routine_schema = 'public';
```

---

## Best Practices Going Forward

### ✅ DO
- Always use the **Utilisateurs** page to create users
- The `create_worker_account()` RPC handles everything atomically
- Password is hashed automatically (bcrypt)
- Permissions are set up automatically

### ❌ DON'T
- Don't manually insert into auth.users from Supabase UI
- Don't skip creating the public.users record
- Don't use plain text passwords
- Don't bypass the application's user creation flow

---

## Implementation in Your Code

### Current Flow (in Utilisateurs.tsx)
```tsx
const { data, error: rpcError } = await supabase.rpc('create_worker_account', {
  p_email:    formData.email.toLowerCase().trim(),
  p_password: formData.password,
  p_name:     formData.name.trim(),
  p_username: formData.username.toLowerCase().trim(),
  p_phone:    formData.phone || null,
  p_role:     formData.role,
});

// Response includes:
// {
//   "success": true,
//   "user_id": "uuid-of-public-user",
//   "auth_user_id": "uuid-of-auth-user",
//   "message": "User created successfully"
// }
```

This is the **correct approach** - use it for all user creation!

---

## Summary

| Issue | Solution |
|-------|----------|
| Manual user creation | Use Utilisateurs page |
| "Database error querying schema" | Link auth.users ↔ public.users |
| Password not hashing | Use RPC function (hashes automatically) |
| RLS permission errors | Ensure public.users record exists |
| Can't retrieve permissions | Check user_permissions table |

---

## Need Help?

1. **Verify** using the SQL checks above
2. **Delete** the problematic user completely
3. **Recreate** using the Utilisateurs page
4. **Test** login immediately after creation
