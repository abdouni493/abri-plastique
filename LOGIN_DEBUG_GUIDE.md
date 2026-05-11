## 🔴 Login Still Hanging - Debugging Guide

### What to Check First

#### 1. **Browser Console Logs** (Critical!)
Open your browser and press **F12** to open Developer Tools:
1. Go to **Console** tab
2. Try logging in with: `admin@admin.com` / `admin123`
3. Look for these messages:

**Expected log sequence:**
```
✅ "Checking active session..."
✅ "Auth state changed: SIGNED_IN [uuid]"
✅ "Fetching user profile for auth_user_id: [uuid]"
✅ "User found: admin" 
✅ "Profile cached for: [uuid]"
✅ "User profile updated: admin"
```

**If you see ERROR logs, that's the problem!** Share the error message.

#### 2. **Common Issues & Fixes**

##### Issue: `Error fetching user: relation "public.users" does not exist`
**Problem:** users table might not have the auth_user_id field populated
**Fix:** Check Supabase database:
- Go to Supabase Dashboard → SQL Editor
- Run this query:
```sql
SELECT id, username, auth_user_id FROM public.users LIMIT 5;
```
- If auth_user_id is NULL, that's the issue! Need to sync auth users to profile table.

---

##### Issue: `PGRST116 - The content type header is missing`
**Problem:** Missing RLS (Row Level Security) permissions
**Fix:** 
1. Go to Supabase Dashboard → Authentication → Policies
2. Check the `users` table RLS policies
3. Verify you have a policy allowing authenticated users to read their own row

---

##### Issue: `Error: relation "public.users" does not exist OR timeout`
**Problem:** Network issue or database credentials wrong
**Fix:**
1. Check your `.env` file has correct SUPABASE_URL and SUPABASE_ANON_KEY
2. Verify your Supabase project is running
3. Check network tab in DevTools - is request being made?

---

### 3. **Quick Diagnostics Script**

Add this to your browser console to test:

```javascript
// Test Supabase connection
const test = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin123'
  });
  
  console.log('Auth result:', { data, error });
  
  if (data?.user) {
    const { data: user, error: err } = await supabase
      .from('users')
      .select('id, username, auth_user_id')
      .eq('auth_user_id', data.user.id)
      .single();
    
    console.log('Profile query result:', { user, err });
  }
};
test();
```

---

### 4. **Verify Test Credentials Exist**

Run in Supabase SQL Editor:

```sql
-- Check if admin user exists in profile table
SELECT id, username, email, auth_user_id, role 
FROM public.users 
WHERE username = 'admin';

-- Check if there are ANY users
SELECT COUNT(*) as user_count FROM public.users;

-- Check if auth system has users
SELECT COUNT(*) as auth_user_count FROM auth.users;
```

---

### 5. **Check Network Requests**

In Browser DevTools:
1. Press **F12** → **Network** tab
2. Try login again
3. Look for requests to Supabase:
   - Should see POST to `.../auth/v1/token` (auth)
   - Should see GET to `.../rest/v1/users` (profile)
   
If these fail with **401, 403, or 500**, that's the issue!

---

### 6. **Temporary Fix: Enable Debug Mode**

Replace the login function temporarily with this super verbose version:

```typescript
const login = async (email: string, password: string) => {
  try {
    console.log('===== LOGIN STARTED =====');
    console.log('Email:', email);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    console.log('After signIn:', { authData, authError });
    
    if (authError) {
      console.error('❌ Auth failed:', authError);
      return { error: authError.message };
    }
    
    if (!authData?.user) {
      console.error('❌ No auth user returned');
      return { error: 'No user returned from auth' };
    }
    
    console.log('✅ Auth successful, user ID:', authData.user.id);
    
    // Try to get profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('auth_user_id', authData.user.id)
      .single();
    
    console.log('After profile query:', { profileData, profileError });
    
    if (profileError || !profileData) {
      console.error('❌ Profile not found:', profileError);
      await supabase.auth.signOut();
      return { error: 'User profile not found' };
    }
    
    console.log('✅ Profile loaded:', profileData.username);
    setUser({
      id: profileData.id,
      name: profileData.username,
      username: profileData.username,
      email: profileData.email,
      role: profileData.role as UserRole,
      phone: '',
      permissions: {},
    });
    
    return { error: null };
  } catch (err: any) {
    console.error('❌ Login exception:', err);
    return { error: err.message };
  }
};
```

---

### 7. **Still Stuck? Check This**

1. **Is Supabase URL correct?**
   - Check `src/lib/supabase.ts`
   - Verify it matches your Supabase project

2. **Is the users table properly linked to auth?**
   - Need an RLS policy or a trigger to sync auth.users to public.users

3. **Do you have test data?**
   - Run this in Supabase SQL Editor:
   ```sql
   INSERT INTO public.users (name, username, email, role)
   VALUES ('Admin', 'admin', 'admin@admin.com', 'admin')
   ON CONFLICT DO NOTHING;
   ```

---

### 📝 What to Share When Asking for Help

1. Screenshot of browser console with errors
2. Output of: `SELECT COUNT(*) FROM public.users;`
3. Your Supabase project URL
4. Step-by-step what you click before login hangs

---

**Next Step:** Check the browser console (F12) and share what errors you see!
