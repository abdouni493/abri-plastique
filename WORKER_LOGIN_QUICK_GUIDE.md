# 🚀 Worker Account & Login - Quick Reference

## Complete Flow

### ① Admin Creates Worker (Utilisateurs UI)
```
Utilisateurs page → "Nouveau Membre" button
    ↓
Form:
  - Name: John Doe
  - Username: john_doe
  - Email: john.doe@example.com
  - Password: SecurePass123
  - Role: worker
    ↓
Click "Save"
    ↓
Frontend calls: supabase.rpc('create_worker_account', {...})
```

### ② Database Creates Account (Backend)
```
create_worker_account() RPC function:
    ↓
1. Validate inputs
    ↓
2. INSERT into auth.users (with bcrypt encrypted password)
    ↓
3. INSERT into public.users (linked to auth user)
    ↓
4. INSERT into public.user_permissions (grant permissions)
    ↓
5. RETURN { success: true, user_id: "...", auth_user_id: "..." }
```

### ③ Worker Logs In (Login Page)
```
Worker goes to login page
    ↓
Enters:
  Email: john.doe@example.com
  Password: SecurePass123
    ↓
Clicks "Login"
    ↓
Frontend calls: supabase.auth.signInWithPassword({email, password})
    ↓
Supabase Auth:
  1. Finds user in auth.users by email
  2. Gets encrypted_password (bcrypt hash)
  3. Verifies: crypt(password, encrypted_password)
  4. If match: returns session ✅
  5. If no match: returns error ❌
```

### ④ Worker Accesses App
```
Session created
    ↓
Frontend fetches public profile from public.users
    ↓
Loads user permissions
    ↓
Shows only permitted interfaces (Caisse mode)
    ↓
Worker can use app! ✅
```

---

## Key Points

### Password Security ✅
- Plain text password sent to backend: `SecurePass123`
- Backend hashes with bcrypt: `crypt('SecurePass123', gen_salt('bf'))`
- Stored as hash: `$2a$12$R9h21cIPz0peS6G11PezCu...`
- Password NEVER stored plain text
- Password NEVER logged or exposed

### Worker Can Login Immediately ✅
- No email confirmation needed
- No additional setup required
- Just create account → worker can login

### Permissions Automatic ✅
- Admin role: gets ALL permissions
- Worker role: gets LIMITED permissions (caisse mode)
- Can be modified by admin after creation

### Database Consistency ✅
- Auth account created: `auth.users`
- Public profile created: `public.users`
- Both linked via `auth_user_id`
- Both created in single atomic RPC call

---

## Testing Steps

### 1. Run SQL Fix (< 1 min)
```
Supabase → SQL Editor → New Query
Copy FIX_CREATE_WORKER_ACCOUNT_RPC.sql
Execute
Wait for "RPC Functions Created Successfully!"
```

### 2. Create Test Worker (1 min)
```
App → Login as admin
Go to Utilisateurs
Click "Nouveau Membre"
Fill form with test data
Click Save
See success message
```

### 3. Verify Worker Exists (30 sec)
```
Still on Utilisateurs page
See new worker in list
Name, email, role all correct
```

### 4. Test Worker Login (2-3 min)
```
Click Logout (top right)
Go to login page
Enter worker email + password
Click Login
If successful: worker sees dashboard ✅
If failed: check credentials, browser console for errors
```

### 5. Verify Permissions (1 min)
```
Logged in as worker
Check sidebar: only Caisse mode visible
No Commercial mode sections
Cannot access admin-only pages
Click on different pages to verify access
```

---

## Troubleshooting Checklist

| Issue | Check |
|-------|-------|
| SQL won't run | pgcrypto enabled? Check for syntax errors |
| Worker can't be created | Unique constraint? Check email/username don't exist |
| "Invalid password" error | Password < 6 chars? Check for special chars |
| Worker can't login | Email typo? Password case-sensitive? Check auth.users for account |
| Worker sees all interfaces | Permissions not granted? Logout/login? |
| Account deleted then recreated can't login | Old auth_user_id in public.users? |

---

## Files Reference

| File | Purpose |
|------|---------|
| `FIX_CREATE_WORKER_ACCOUNT_RPC.sql` | SQL to create RPC functions |
| `WORKER_ACCOUNT_LOGIN_COMPLETE.md` | Detailed guide |
| `QUICK_FIX_UTILISATEURS.md` | 3-step quick start |
| `src/pages/Utilisateurs.tsx` | Frontend UI for creating workers |
| `src/context/AuthContext.tsx` | Login/auth logic |

---

## Success Criteria ✅

After fix is complete:
- [ ] Can create workers via UI without errors
- [ ] Workers appear in users list
- [ ] Worker can login with email + password
- [ ] Worker sees dashboard (Caisse mode)
- [ ] Worker cannot see Commercial mode
- [ ] Admin can assign/revoke permissions
- [ ] Permissions take effect after logout/login
- [ ] No 404 errors for RPC functions
- [ ] No "gen_salt" errors
- [ ] No email constraint violations

---

## 🎉 You're Done!

Once all tests pass:
- Admin can create unlimited workers
- Each worker gets unique login credentials
- Permissions are automatically managed
- System is ready for production use

**Total time: ~10 minutes**
