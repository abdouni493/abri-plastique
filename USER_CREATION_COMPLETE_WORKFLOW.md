# 📋 COMPLETE USER CREATION WORKFLOW - Step by Step

## Your Exact Scenario

You want:
1. ✅ Create user via application UI (Utilisateurs page)
2. ✅ User is automatically created in Supabase Auth
3. ✅ Get the auth UID automatically
4. ✅ Insert into public.users table automatically
5. ✅ User can login immediately

**Good news**: Your application already does this! 🎉

---

## Complete Workflow - Step by Step

### Phase 1: Create User in Application UI

#### Step 1: Navigate to Utilisateurs Page
```
Dashboard → Left Sidebar → "Utilisateurs"
```

#### Step 2: Click "Nouveau Membre"
A modal form appears with these fields:

```
┌─────────────────────────────────────┐
│  Modal: Nouveau Membre              │
├─────────────────────────────────────┤
│                                     │
│ Nom Complet:      [______________] │
│ Nom d'Utilisateur: [______________] │
│ Email:            [______________] │
│ Mot de Passe:     [______________] │
│ Téléphone:        [______________] │
│ Poste:            [Select  v     ] │
│                                     │
│     [Annuler]  [Créer l'utilisateur]│
└─────────────────────────────────────┘
```

#### Step 3: Fill the Form
Example for admin user:
```
Nom Complet:        Administrator
Nom d'Utilisateur:  admin
Email:              admin@admin.com
Mot de Passe:       AdminSecure123!
Téléphone:          +213 555 123456
Poste:              admin (from dropdown)
```

#### Step 4: Click "Créer l'utilisateur"
Backend process starts:

```
User clicks Submit
    ↓
Frontend: Create FormData object
    ↓
Frontend: Call supabase.rpc('create_worker_account', {
    p_email: 'admin@admin.com',
    p_password: 'AdminSecure123!',
    p_name: 'Administrator',
    p_username: 'admin',
    p_phone: '+213 555 123456',
    p_role: 'admin'
  })
    ↓
Backend RPC Function: create_worker_account()
    ↓
    ├─ Step 1: Validate inputs
    │  └─ Check email format, password length, etc.
    │
    ├─ Step 2: INSERT into auth.users
    │  └─ Creates authentication record with hashed password
    │  └─ Generates UUID: c7688b9c-fde3-455a-9f59-42d05cf6acf2 (example)
    │
    ├─ Step 3: INSERT into public.users
    │  └─ Creates application user record
    │  └─ Links to auth user via auth_user_id: c7688b9c-fde3-455a-9f59-42d05cf6acf2
    │
    ├─ Step 4: INSERT into user_permissions
    │  └─ Grants default permissions for the role
    │
    └─ Step 5: RETURN success response
       └─ {
             "success": true,
             "user_id": "550e8400-e29b-41d4-a716-446655440000",
             "auth_user_id": "c7688b9c-fde3-455a-9f59-42d05cf6acf2",
             "message": "User created successfully"
          }
    ↓
Frontend: Receive response
    ↓
Frontend: Log auth_user_id to console ✅
    ↓
Frontend: Reload users list
    ↓
Frontend: Close modal
    ↓
Frontend: Clear form
    ↓
Frontend: Show success notification ✅
```

### Phase 2: Verify User Created

#### Step 1: Check Console Logs
Open browser DevTools (F12) → Console tab

Look for this message:
```
✅ [Utilisateurs] User created successfully via RPC {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  auth_user_id: "c7688b9c-fde3-455a-9f59-42d05cf6acf2",
  email: "admin@admin.com",
  message: "User created successfully"
}
```

**Save the auth_user_id**: `c7688b9c-fde3-455a-9f59-42d05cf6acf2`

#### Step 2: Verify in Application
The user should appear in Utilisateurs list:

```
┌───────────────────────────────────────────────┐
│ Users List                                    │
├───────────────────────────────────────────────┤
│ Name            | Email          | Role   | # │
├───────────────────────────────────────────────┤
│ Administrator   | admin@admin.com| admin  | ⋮ │
│ Previous User   | user@example   | worker | ⋮ │
└───────────────────────────────────────────────┘
```

#### Step 3: Verify in Database (Supabase SQL)
Go to Supabase Dashboard → SQL Editor

Run this query:
```sql
SELECT 
  pu.id,
  pu.name,
  pu.email,
  pu.auth_user_id,
  pu.role,
  pu.status
FROM public.users pu
WHERE pu.email = 'admin@admin.com';
```

Expected result:
```
┌──────────────────────────────────────────────────┐
│ id                 | name           | email      │
├──────────────────────────────────────────────────┤
│ 550e8400-...       | Administrator  | admin@...  │
│ auth_user_id: c7688b9c-fde3-455a-9f59-42d05cf6acf2
│ role: admin
│ status: active
└──────────────────────────────────────────────────┘
```

### Phase 3: Test Login

#### Step 1: Logout from Dashboard
Click user menu → "Logout"

#### Step 2: Go to Login Page
```
http://localhost:3000/login
```

#### Step 3: Enter Credentials
```
Email:    admin@admin.com
Password: AdminSecure123!
```

#### Step 4: Click Login
Should immediately redirect to Dashboard ✅

#### Step 5: Success!
You're logged in as the new admin user 🎉

---

## What Happens Behind the Scenes

### Database Records Created

#### auth.users table (Supabase Auth)
```sql
id:                  c7688b9c-fde3-455a-9f59-42d05cf6acf2
email:               admin@admin.com
email_confirmed_at:  (null - not required)
encrypted_password:  $2b$10$... (bcrypt hash)
raw_user_meta_data:  {"name": "Administrator", ...}
created_at:          2026-05-10 10:30:00 UTC
```

#### public.users table (Your App)
```sql
id:              550e8400-e29b-41d4-a716-446655440000
name:            Administrator
username:        admin
email:           admin@admin.com
role:            admin
status:          active
auth_user_id:    c7688b9c-fde3-455a-9f59-42d05cf6acf2  ← LINKS TO auth.users
created_at:      2026-05-10 10:30:00 UTC
updated_at:      2026-05-10 10:30:00 UTC
```

#### public.user_permissions table
```sql
user_id:          550e8400-e29b-41d4-a716-446655440000
permission_key:   view_ventes
granted:          true

user_id:          550e8400-e29b-41d4-a716-446655440000
permission_key:   view_achats
granted:          true

... (and many more permissions)
```

### Login Flow

When user submits login form:
```
1. Frontend: POST to Supabase Auth
   Email: admin@admin.com
   Password: AdminSecure123!
   ↓
2. Supabase Auth: Verify password against encrypted_password
   ✅ Match found
   ↓
3. Supabase Auth: Return auth session with JWT token
   {
     "user": {
       "id": "c7688b9c-fde3-455a-9f59-42d05cf6acf2",
       "email": "admin@admin.com",
       ...
     },
     "session": {
       "access_token": "eyJhbGciOi...",
       ...
     }
   }
   ↓
4. Frontend: Receives session
   ↓
5. Frontend: Query public.users using auth_user_id
   WHERE public.users.auth_user_id = 'c7688b9c-fde3-455a-9f59-42d05cf6acf2'
   ↓
6. Frontend: Get user data (role, permissions, etc.)
   ↓
7. Frontend: Redirect to Dashboard
   ✅ Login successful!
```

---

## Common Issues & Fixes

### Issue: "Database error querying schema"
**Cause**: Missing public.users record

**Fix**:
```sql
-- Check if public.users record exists
SELECT * FROM public.users 
WHERE auth_user_id = 'c7688b9c-fde3-455a-9f59-42d05cf6acf2';

-- If empty, insert it:
INSERT INTO public.users (
  id, name, username, email, role, status, auth_user_id
) VALUES (
  gen_random_uuid(),
  'Administrator',
  'admin',
  'admin@admin.com',
  'admin'::user_role,
  'active'::user_status,
  'c7688b9c-fde3-455a-9f59-42d05cf6acf2'
);
```

### Issue: "Invalid login credentials"
**Cause**: Wrong password or email doesn't exist

**Fix**:
- Verify email is correct: `admin@admin.com`
- Verify password matches what you entered: `AdminSecure123!`
- Check if user exists: 
  ```sql
  SELECT email FROM auth.users WHERE email = 'admin@admin.com';
  ```

### Issue: User created but disappears from list
**Cause**: Permissions or RLS policy issue

**Fix**:
```sql
-- Verify user has view_all_users permission
SELECT * FROM public.user_permissions
WHERE user_id IN (
  SELECT id FROM public.users WHERE email = 'admin@admin.com'
)
AND permission_key = 'view_all_users';
```

---

## Complete SQL Verification Script

Run this to verify everything is set up correctly:

```sql
-- Check auth.users
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Check public.users
SELECT COUNT(*) as public_users_count FROM public.users;

-- Check create_worker_account function
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'create_worker_account';

-- Check RLS is enabled
SELECT rowsecurity FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Check a specific user
SELECT 
  u.id, u.email, u.role, u.auth_user_id,
  COUNT(p.id) as permissions
FROM public.users u
LEFT JOIN public.user_permissions p ON u.id = p.user_id
WHERE u.email = 'admin@admin.com'
GROUP BY u.id, u.email, u.role, u.auth_user_id;
```

---

## Summary Checklist

- ✅ Fill Utilisateurs form completely
- ✅ Password minimum 6 characters
- ✅ Click "Créer l'utilisateur"
- ✅ See success notification
- ✅ Check console for auth_user_id
- ✅ Verify user in users list
- ✅ Test login with email + password
- ✅ Access dashboard after login

---

## You're All Set! 🚀

Your application automatically:
1. Creates auth.users record
2. Gets the UUID (auth_user_id)
3. Creates public.users record with that UUID
4. Links them together
5. Grants permissions
6. Returns the auth_user_id in console logs

**No manual SQL needed** - everything is automated!
