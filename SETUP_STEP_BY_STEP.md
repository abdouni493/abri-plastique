## 🚀 Step-by-Step Login Setup Guide

### Current Status
❌ Login is stuck on "Connexion..." 
✅ We've added diagnostic tools to identify the exact problem

---

## Step 1: Run the Diagnostic (5 minutes)

### 1.1 Make sure app is running
Terminal shows: `Local:   http://localhost:3001/`

### 1.2 Open the app
Go to: http://localhost:3001

### 1.3 Look for the green diagnostic button
You should see in **bottom right corner** a green box with "Run Diagnostics" button

### 1.4 Click it and wait for JSON output
The result will look like:
```json
{
  "hasSession": false,
  "usersTableOk": true,
  "userCount": 0,
  "loginAttempted": true,
  "loginError": "..."
}
```

### 1.5 Analyze the results

**If `userCount: 0` → Go to Step 2 (CREATE TEST USER)**

**If `loginError: "..."` → Go to Step 3 (CREATE AUTH USER)**

**If `profileFound: false` → Go to Step 4 (LINK USERS)**

**If everything is true/OK → Go to Step 5 (RLS POLICY FIX)**

---

## Step 2: Create Test User in Database

If diagnostic shows `userCount: 0` or `sampleUser` is missing:

### 2.1 Go to Supabase SQL Editor
1. Open [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### 2.2 Copy this SQL
```sql
-- Create test users
INSERT INTO public.users (username, email, name, role)
VALUES 
  ('admin', 'admin@admin.com', 'Admin User', 'admin'),
  ('worker', 'worker@admin.com', 'Worker User', 'worker')
ON CONFLICT (username) DO NOTHING;

-- Verify they were created
SELECT id, username, email, role, auth_user_id FROM public.users;
```

### 2.3 Click **Run**
You should see the users appear in the result

### 2.4 Re-run diagnostic
Check if `userCount` is now > 0

---

## Step 3: Create Auth Users in Supabase

If diagnostic shows `loginError`, the user doesn't exist in Auth:

### 3.1 Go to Supabase Dashboard
1. Click **Authentication** (left sidebar)
2. Click **Users**
3. Click **+ Add User**

### 3.2 Create Admin user
- Email: `admin@admin.com`
- Password: `admin123`
- Click **Create User**

### 3.3 Create Worker user
- Email: `worker@admin.com`
- Password: `worker123`
- Click **Create User**

### 3.4 Re-run diagnostic
Check if `loginError` is now gone

---

## Step 4: Link Auth Users to Profiles

If diagnostic shows profile not found but user exists:

### 4.1 Go to Supabase SQL Editor
New Query

### 4.2 Get the Auth User IDs
```sql
-- Copy the IDs from this output
SELECT id, email FROM auth.users WHERE email IN ('admin@admin.com', 'worker@admin.com');
```

### 4.3 Link them
```sql
-- Replace the UUIDs with actual values from above
UPDATE public.users
SET auth_user_id = '[PASTE_UUID_HERE]'
WHERE email = 'admin@admin.com';

UPDATE public.users
SET auth_user_id = '[PASTE_UUID_HERE]'
WHERE email = 'worker@admin.com';

-- Verify the link
SELECT username, email, auth_user_id FROM public.users;
```

### 4.4 Re-run diagnostic
Check if `profileFound` is now true

---

## Step 5: Fix RLS Policies

If diagnostic works but login still fails, it's a Row Level Security issue:

### 5.1 Go to Supabase SQL Editor
New Query

### 5.2 Create RLS Policies
```sql
-- First, enable RLS if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Service role bypass" ON public.users;

-- Create new policies
CREATE POLICY "Users can read their own record"
ON public.users FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Service role can do anything"
ON public.users
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Same for permissions table
DROP POLICY IF EXISTS "Users can read their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Service role bypass permissions" ON public.user_permissions;

CREATE POLICY "Users can read their own permissions"
ON public.user_permissions FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can do anything on permissions"
ON public.user_permissions
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

### 5.3 Re-run diagnostic
Everything should now work!

---

## Step 6: Test the Login

### 6.1 Try logging in
Use credentials:
- Email: `admin@admin.com`
- Password: `admin123`

### 6.2 Expected result
- ✅ Quick redirect to dashboard (1-2 seconds)
- ✅ Dashboard appears
- ✅ No more "Connexion..." hang

### 6.3 If still not working
1. Check browser console (F12)
2. Look for error messages
3. Run diagnostic again
4. Share the console error + diagnostic output

---

## ⚡ Quick Reference: What Each Test Does

| Test | What It Checks |
|------|---------------|
| `hasSession` | Are you already logged in? |
| `usersTableOk` | Can we read the public.users table? |
| `userCount` | How many users exist in the table? |
| `sampleUser` | What does a sample user look like? |
| `authTableOk` | Can we see auth.users? |
| `loginAttempted` | Did we try to sign in? |
| `loginError` | Why did sign-in fail? |
| `loginUserId` | What auth user ID logged in? |
| `profileFound` | Did we find the matching profile? |
| `profileData` | What's in the profile? |

---

## 🆘 Troubleshooting

### Diagnostic shows everything OK but login still doesn't work

1. **Check browser console** (F12 → Console)
   - Look for red errors
   - Share the error message

2. **Check network tab** (F12 → Network)
   - Look for failed requests (red)
   - Click on each and check the response

3. **Verify env variables** (in `src/lib/supabase.ts`)
   - `VITE_SUPABASE_URL` - should start with `https://`
   - `VITE_SUPABASE_ANON_KEY` - should be long string

### "Permission denied" error

RLS policy issue. Run the Step 5 SQL again.

### "User not found" error

User not created or not linked. Run Step 2 or Step 4.

### "Invalid login credentials" error

Auth user doesn't exist. Run Step 3.

---

## ✅ Final Checklist

- [ ] Diagnostic button appears (bottom right, green)
- [ ] Run diagnostic successfully
- [ ] `usersTableOk`: true
- [ ] `userCount`: >= 1
- [ ] `profileFound`: true
- [ ] Login with admin@admin.com works
- [ ] Redirects to dashboard
- [ ] No "Connexion..." hang

If all checked, you're done! 🎉

---

**Next: Run the diagnostic and share the output if you hit any issues!**
