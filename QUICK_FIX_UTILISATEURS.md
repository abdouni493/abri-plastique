# ⚡ QUICK START - Fix Utilisateurs Errors (3 Steps)

## Step 1️⃣: Run SQL (30 seconds)
1. Go to Supabase Dashboard → SQL Editor → New Query
2. Open: **FIX_CREATE_WORKER_ACCOUNT_RPC.sql**
3. Copy all code → Paste → Execute
4. Wait for: ✅ "RPC Functions Created Successfully!"

## Step 2️⃣: Refresh Browser (10 seconds)
- Press: `Ctrl + Shift + R` (hard refresh)
- Wait for page to load

## Step 3️⃣: Test (1-2 minutes)
1. Go to **Utilisateurs** page (Users)
2. Click **Nouveau Membre** (New Member)
3. Fill in form:
   ```
   Name:     John Doe
   Username: john_doe
   Email:    john.doe@example.com
   Password: Password123
   Role:     worker
   ```
4. Click **Save**
5. ✅ User appears in list

---

## ❓ What Gets Fixed

| Error | Fix |
|-------|-----|
| `404 Not Found` for `create_worker_account` | Creates RPC function |
| `gen_salt() does not exist` | Enables pgcrypto extension |
| `violates check constraint users_email_check` | Fixes email validation |

---

## ⏱️ Total Time: ~3 minutes

---

## 🆘 If It Fails

**Check 1:** Did you get "RPC Functions Created Successfully!"?
- No → Run SQL again, check for errors

**Check 2:** Did you hard refresh? 
- Press: `Ctrl + Shift + R`

**Check 3:** What error do you see now?
- Open DevTools: `F12` → Console tab → Try creating user again
- Post the exact error message

**Check 4:** Can you run this in SQL Editor?
```sql
SELECT public.create_worker_account(
  'test@test.com', 'pass123', 'Test', 'test123', null, 'worker'
);
```
- Should return `{"success": true, ...}`
- If error, that's the real problem

---

## 📚 Full Documentation
See: **FIX_UTILISATEURS_COMPLETE.md** for detailed troubleshooting
