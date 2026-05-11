## 🔧 Login Issue - Current Status & Solutions

### What's Happening Now

Your login is stuck showing "Connexion..." because the user profile cannot be loaded from the database. This is likely one of these issues:

1. **Missing Data** - No user in public.users table for the authenticated user
2. **RLS Blocked** - Row Level Security blocking access
3. **Missing Link** - auth_user_id not set in public.users table
4. **Wrong Credentials** - Test user doesn't exist in Supabase Auth

---

## 🔍 How to Diagnose (Do This Now!)

### Step 1: See the Diagnostic Tool
1. Open http://localhost:3001 in your browser
2. Look in the **bottom right corner** for a green **"Run Diagnostics"** button
3. Click it and wait for results

### Step 2: Check the Results
The diagnostic will show:
- ✅ `hasSession` - Are you logged into Supabase Auth?
- ✅ `usersTableOk` - Can we read public.users table?
- ✅ `userCount` - How many users exist?
- ✅ `sampleUser` - Sample user data
- ✅ `profileFound` - Was the login profile found?

### Step 3: Share the Results
Look at the output. If you see errors, that's what we need to fix!

---

## 🛠️ Quick Fixes Based on Common Issues

### Issue 1: "usersTableOk": false or error about table not existing

**Solution:** Your public.users table might not exist or you don't have permission.

In Supabase SQL Editor, run:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'users'
);

-- If NOT found, create a minimal users table:
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'worker',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read themselves
CREATE POLICY "Users can read their own record"
ON public.users FOR SELECT
USING (auth.uid() = auth_user_id);
```

---

### Issue 2: "profileFound": false after login

**Problem:** User authenticated but no profile row found

**Solution A:** Check if test user exists:
```sql
-- Check admin user
SELECT * FROM public.users WHERE username = 'admin';

-- If not found, create it:
INSERT INTO public.users (username, email, name, role)
VALUES ('admin', 'admin@admin.com', 'Admin', 'admin');
```

**Solution B:** Link existing Supabase Auth users to profiles:
```sql
-- This links auth users to profiles by matching email
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.email = au.email AND u.auth_user_id IS NULL;
```

---

### Issue 3: "loginError" - Can't sign in

**Problem:** The credentials don't work in Supabase Auth

**Solution:** Create test user in Supabase Auth:
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Email: `admin@admin.com`
4. Password: `admin123`
5. Click "Create User"

Then create matching profile:
```sql
INSERT INTO public.users (username, email, name, role)
VALUES ('admin', 'admin@admin.com', 'Admin', 'admin');
```

Then manually link them:
```sql
UPDATE public.users u
SET auth_user_id = '[COPY AUTH USER ID HERE]'
WHERE email = 'admin@admin.com';
```

---

### Issue 4: RLS Errors (403/401)

**Problem:** Row Level Security blocking access

**Solution:** Create RLS policies:
```sql
-- Allow authenticated users to read their own record
CREATE POLICY "Users can read their own record"
ON public.users FOR SELECT
USING (auth.uid() = auth_user_id);

-- Allow service role to do everything (for admin)
CREATE POLICY "Service role can do anything"
ON public.users
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

---

## 📋 Complete Setup Script

If you're starting fresh, run this in Supabase SQL Editor:

```sql
-- ============================================================================
-- Complete Login System Setup
-- ============================================================================

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE REFERENCES auth.users(email),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'worker')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- 3. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies if they exist
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can read permissions for their own record" ON public.user_permissions;
DROP POLICY IF EXISTS "Service role bypass" ON public.users;
DROP POLICY IF EXISTS "Service role bypass permissions" ON public.user_permissions;

-- 5. Create RLS policies
CREATE POLICY "Users can read their own record"
ON public.users FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can read their own permissions"
ON public.user_permissions FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can do anything on users"
ON public.users
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do anything on permissions"
ON public.user_permissions
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);

-- 7. Create test user (AFTER creating auth user in dashboard)
-- First, create in Auth via Dashboard, then run this:
-- Note: Replace 'YOUR_AUTH_USER_ID' with the UUID from auth.users table

-- For now, just create the profile:
INSERT INTO public.users (username, email, name, role)
VALUES ('admin', 'admin@admin.com', 'Admin User', 'admin')
ON CONFLICT (username) DO NOTHING;

-- After creating auth user, link them:
-- UPDATE public.users
-- SET auth_user_id = '[UUID from auth.users table]'
-- WHERE username = 'admin';
```

---

## ✅ Testing Checklist

After setup, verify:

- [ ] Run diagnostics - all tests pass
- [ ] Database table exists: `SELECT * FROM public.users LIMIT 1;`
- [ ] Auth user exists: In Supabase Dashboard → Users
- [ ] User linked: `SELECT auth_user_id FROM public.users WHERE username='admin';` is NOT NULL
- [ ] Try login with admin@admin.com / admin123
- [ ] See immediate redirect (no more "Connexion..." hang)

---

## 📞 Need Help?

1. **Run the diagnostic** (green button bottom right)
2. **Copy the JSON output**
3. **Check which test failed**
4. **Run the corresponding fix above**
5. **Re-run diagnostic to verify**

If still stuck, share:
- The diagnostic output (JSON)
- What steps you've tried
- Any error messages from browser console (F12)

---

**The app is now diagnostic-enabled. Visit http://localhost:3001 and click the green button!**
