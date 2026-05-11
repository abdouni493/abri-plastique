# 🔐 Worker Account Creation & Login Guide

## Overview

When you create a new worker through the Utilisateurs page, the system:

1. ✅ Creates an auth account in Supabase Authentication
2. ✅ Creates a public profile in the database
3. ✅ Grants appropriate permissions
4. ✅ Enables immediate login capability

---

## Step-by-Step: Create a Worker

### 1. Navigate to Utilisateurs Page
- Login as admin
- Go to: **Utilisateurs** (Users) page
- Click: **Nouveau Membre** (New Member) button

### 2. Fill the Form
```
Name:         John Doe
Username:     john_doe
Email:        john.doe@example.com
Phone:        +212 612 345 678  (optional)
Password:     SecurePass123
Role:         worker
```

### 3. Click Save
- System calls `create_worker_account()` RPC function
- Creates account in `auth.users` (with encrypted password)
- Creates profile in `public.users`
- Grants permissions

### 4. Success Response
You'll see:
```json
{
  "success": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440002",
  "auth_user_id": "550e8400-e29b-41d4-a716-446655440003",
  "message": "Worker account created successfully"
}
```

---

## Worker Login (After Account Created)

### 1. Worker Goes to Login Page
- URL: `http://localhost:3000/login`
- Or app shows login screen

### 2. Enter Credentials
```
Email:    john.doe@example.com
Password: SecurePass123
```

### 3. Click Login
- Supabase Auth verifies credentials
- Checks `auth.users` table
- Compares password with encrypted version
- If correct: logs in worker

### 4. Worker Sees Dashboard
- Only sees interfaces they have permission for
- Caisse mode (default for workers)
- Cannot see Commercial mode
- Can access allowed features

---

## What Gets Created in Database

### In `auth.users` (Supabase Auth)
```sql
id:                  550e8400-e29b-41d4-a716-446655440003
email:               john.doe@example.com
encrypted_password:  $2a$12$... (bcrypt hash)
role:                authenticated
raw_user_meta_data:  {"name": "John Doe"}
email_confirmed_at:  2026-05-09 (NOW())
created_at:          2026-05-09
updated_at:          2026-05-09
```

### In `public.users`
```sql
id:              550e8400-e29b-41d4-a716-446655440002
name:            John Doe
username:        john_doe
email:           john.doe@example.com
phone:           +212 612 345 678
role:            worker
status:          active
auth_user_id:    550e8400-e29b-41d4-a716-446655440003
created_at:      2026-05-09
updated_at:      2026-05-09
```

### In `public.user_permissions`
```
user_id: 550e8400-e29b-41d4-a716-446655440002

Granted permissions (12 for workers):
- view_dashboard
- view_caisse
- create_transaction
- edit_transaction
- view_bank
- view_transfer
- view_sales
- view_purchases
- pay_debts
- view_clients
- view_suppliers
- view_reports
```

---

## How Password Hashing Works

### Password Security Flow

```
User enters password:
"SecurePass123"
        ↓
Backend receives in RPC:
p_password = "SecurePass123"
        ↓
PostgreSQL pgcrypto function:
crypt('SecurePass123', gen_salt('bf'))
        ↓
Returns bcrypt hash:
$2a$12$R9h21cIPz0peS6G11PezCu7DkjRm3ZgV2Smart7.vfQrHTR2CK...
        ↓
Stored in auth.users.encrypted_password
        ↓
When worker logs in:
crypt(entered_password, encrypted_password) 
checks if they match
        ↓
Login succeeds ✅
```

### Security Features
- ✅ Passwords never stored in plain text
- ✅ Bcrypt with 12 rounds (very strong)
- ✅ Password never sent to your app backend
- ✅ Handled entirely by Supabase Auth
- ✅ Passwords never logged or displayed

---

## Login Flow in Frontend Code

### In `AuthContext.tsx` (simplified):

```typescript
// User enters credentials on login page
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'john.doe@example.com',
  password: 'SecurePass123'
});

// Supabase Auth:
// 1. Looks up email in auth.users
// 2. Gets encrypted password
// 3. Calls: crypt('SecurePass123', encrypted_password)
// 4. If match: returns session
// 5. If no match: returns "Invalid credentials" error

if (data.user) {
  // Login successful!
  // Now fetch public profile from public.users
  const profile = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .single();
  
  // Use profile.role and profile.permissions for access control
}
```

---

## Troubleshooting

### Worker Can't Login

**Problem:** "Invalid email or password"
**Solution:**
1. Check email is typed correctly (case-insensitive)
2. Check password is correct (case-sensitive)
3. Verify account was created (check `SELECT * FROM auth.users WHERE email = '...';`)
4. Try logging out completely and clearing cache

**Problem:** Account doesn't appear in auth.users
**Solution:**
1. Make sure SQL was run successfully
2. Check for error message when creating worker
3. Verify `auth_user_id` is not NULL in public.users

### Worker Sees All Interfaces

**Problem:** Worker sees both Caisse and Commercial modes
**Solution:**
1. Admin should assign permissions explicitly
2. Go to Utilisateurs page
3. Click worker's permissions
4. Uncheck Commercial mode
5. Worker must logout/login to see changes

### Password Doesn't Work

**Problem:** Password seems correct but won't login
**Solution:**
1. Make sure pgcrypto extension is enabled (should be from SQL fix)
2. Check password is at least 6 characters
3. Verify password was saved (check `encrypted_password` is not NULL)
4. Try with a new worker account with a simpler password

---

## Testing Checklist

After running the SQL fix and creating a worker:

- [ ] Worker account created with "Nouveau Membre" button
- [ ] Success message appears
- [ ] Worker shows in users list
- [ ] Worker's email is in the list
- [ ] Worker's role is "worker"
- [ ] Worker has permissions listed
- [ ] Can logout as admin
- [ ] Can login with worker email + password
- [ ] Worker sees Caisse mode only
- [ ] Worker cannot access Commercial mode
- [ ] Worker can create transactions (if permission granted)
- [ ] Admin can delete worker
- [ ] Worker can no longer login after deletion

---

## Advanced: Verify Database

Run these in Supabase SQL Editor:

```sql
-- Find the worker we just created
SELECT * FROM auth.users WHERE email = 'john.doe@example.com';
SELECT * FROM public.users WHERE email = 'john.doe@example.com';
SELECT * FROM public.user_permissions 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'john.doe@example.com');

-- Test password (should return 1 if password is "SecurePass123")
-- Note: Don't do this in production! Only for testing.
-- SELECT 
--   (crypt('SecurePass123', 
--     (SELECT encrypted_password FROM auth.users 
--      WHERE email = 'john.doe@example.com')
--   ) = (SELECT encrypted_password FROM auth.users 
--        WHERE email = 'john.doe@example.com')
--   ) as password_matches;
```

---

## Summary

| Step | What Happens | Database |
|------|--------------|----------|
| 1. Create worker in UI | RPC function called | Both auth & public records created |
| 2. Worker clicks Login | Auth system verifies password | Supabase Auth handles it |
| 3. Credentials correct | Session created | Worker logged in |
| 4. Wrong credentials | Error returned | No session, user stays on login |

✅ **Result:** Worker can login immediately after being created!
