# 🔧 Fix for Utilisateurs.tsx Errors

## ❌ Errors You're Seeing

1. **`POST https://atxoupjkwoltgwlbhkih.supabase.co/rest/v1/rpc/create_worker_account 404 (Not Found)`**
   - The RPC function `create_worker_account` doesn't exist in your database

2. **`function gen_salt(unknown) does not exist`**
   - The `pgcrypto` PostgreSQL extension is not enabled

3. **`new row for relation "users" violates check constraint "users_email_check"`**
   - The email validation constraint is too restrictive

## ✅ How to Fix (2 minutes)

### Step 1: Run the SQL Fix
1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Open file: `FIX_CREATE_WORKER_ACCOUNT_RPC.sql` from your project
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click **Execute** / **Run**
7. Wait for: `RPC Functions Created Successfully!`

### Step 2: Test the Fix
1. Go back to the app
2. Navigate to **Utilisateurs** page (Users page)
3. Click **Nouveau Membre** (New Member)
4. Fill in the form:
   - Name: `John Doe`
   - Username: `john_doe`
   - Email: `john@example.com`
   - Phone: `+212123456789` (optional)
   - Password: `password123`
   - Role: `worker`
5. Click **Save**
6. If successful, the user will appear in the list ✅

## 📋 What Was Fixed

### Created Functions
- ✅ `create_worker_account()` - Creates auth user + public profile
- ✅ `delete_worker_account()` - Deletes user account atomically

### Enabled Extensions
- ✅ `pgcrypto` - Provides `gen_salt()` and `crypt()` functions

### Fixed Constraints
- ✅ `users_email_check` - Now accepts valid email formats

## 🔍 Troubleshooting

### If you get "404 Not Found" again:
- Make sure you ran the SQL and got the success message
- Try refreshing the page
- Check Supabase Dashboard → Functions to verify the RPC exists

### If you get "Email already exists":
- This is normal - use a unique email address
- You can delete the test user and try again

### If you get other errors:
- Check the console (browser F12) for the exact error message
- Make sure all required fields are filled in
- Try with a different email address

## 📚 Additional Resources

- See: [CREATE_TEST_ACCOUNTS.sql](CREATE_TEST_ACCOUNTS.sql) for creating test users
- See: [USERS_TABLE_FIX.sql](USERS_TABLE_FIX.sql) for user table structure
- See: [LOGIN_COMPLETE_FIX_GUIDE.md](LOGIN_COMPLETE_FIX_GUIDE.md) for auth setup

## ⏱️ Time Required
- Run SQL: **< 1 minute**
- Test: **< 2 minutes**
- **Total: ~3 minutes**
