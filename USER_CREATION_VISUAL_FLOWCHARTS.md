# 📊 VISUAL FLOWCHARTS - User Creation Process

## Complete User Creation & Login Flow

### PART 1: User Creation Flow (What Happens in Your App)

```
┌─────────────────────────────────────────────────────────────────┐
│                    START: UTILISATEURS PAGE                     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  User clicks             │
                    │  "Nouveau Membre"        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │  Modal Form Appears       │
                    │  ┌──────────────────────┐ │
                    │  │ Nom Complet:      _  │ │
                    │  │ Username:         _  │ │
                    │  │ Email:            _  │ │
                    │  │ Password:         _  │ │
                    │  │ Phone:            _  │ │
                    │  │ Role: [Select]    _  │ │
                    │  └──────────────────────┘ │
                    └────────────┬──────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │  User clicks             │
                    │  "Créer l'utilisateur"   │
                    └────────────┬──────────────┘
                                 │
          ┌──────────────────────▼──────────────────────────┐
          │                                                 │
          │    FRONTEND: Call Supabase RPC Function        │
          │    ✓ RPC: create_worker_account()             │
          │    ✓ Send: email, password, name, role        │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │        BACKEND: PostgreSQL Function            │
          │        (Runs with SECURITY DEFINER)            │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │  STEP 1: Validate Input                        │
          │  ├─ Check email format                         │
          │  ├─ Check password length >= 6                 │
          │  ├─ Check name not empty                       │
          │  └─ Return error if any fail                   │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │  STEP 2: INSERT into auth.users                │
          │  ┌────────────────────────────────────────────┐ │
          │  │ auth.users                                 │ │
          │  ├────┬─────────────────────────────────────┤ │
          │  │ id │ c7688b9c-fde3-455a-9f59-42d05cf6acf2│ │ ← Generated UUID
          │  │ email       │ admin@admin.com             │ │
          │  │ password    │ $2b$10$... (hashed)         │ │ ← bcrypt hash
          │  │ metadata    │ {"name": "Administrator"}   │ │
          │  └────┴─────────────────────────────────────┘ │
          │                                                 │
          │  ✅ Password is hashed with bcrypt             │
          │  ✅ UUID is generated and stored               │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │  STEP 3: INSERT into public.users               │
          │  ┌────────────────────────────────────────────┐ │
          │  │ public.users                               │ │
          │  ├────┬─────────────────────────────────────┤ │
          │  │ id │ 550e8400-e29b-41d4-a716-446655440000│ │ ← Different UUID
          │  │ name        │ Administrator              │ │
          │  │ username    │ admin                       │ │
          │  │ email       │ admin@admin.com             │ │
          │  │ role        │ admin                       │ │
          │  │ status      │ active                      │ │
          │  │ auth_user_id│ c7688b9c-...               │ │ ← LINKS to auth.users!
          │  └────┴─────────────────────────────────────┘ │
          │                                                 │
          │  ✅ Linked to auth.users via auth_user_id      │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │  STEP 4: INSERT into user_permissions          │
          │  ┌────────────────────────────────────────────┐ │
          │  │ user_permissions                           │ │
          │  ├────┬────────────────┬────────────────────┤ │
          │  │ user_id  │ permission_key    │ granted    │ │
          │  ├──────────┼─────────────────────┼──────────┤ │
          │  │ 550e8400 │ view_ventes       │ true     │ │
          │  │ 550e8400 │ view_achats       │ true     │ │
          │  │ 550e8400 │ view_dashboard    │ true     │ │
          │  │ ... (many more permissions)               │ │
          │  └────┴────────────────┴────────────────────┘ │
          │                                                 │
          │  ✅ Permissions granted based on role          │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │  STEP 5: RETURN Success Response               │
          │  ┌────────────────────────────────────────────┐ │
          │  │ {                                          │ │
          │  │   "success": true,                         │ │
          │  │   "message": "User created successfully",  │ │
          │  │   "user_id": "550e8400-...",              │ │
          │  │   "auth_user_id":                         │ │
          │  │     "c7688b9c-fde3-455a-9f59-42d05cf6acf2"│ │
          │  │ }                                          │ │
          │  └────────────────────────────────────────────┘ │
          │                                                 │
          │  ✅ auth_user_id returned for reference        │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │                                                 │
          │  FRONTEND: Receive Response                    │
          │  ✓ Parse JSON response                         │
          │  ✓ Log auth_user_id to console                │
          │  ✓ Reload users list                          │
          │  ✓ Close modal                                │
          │  ✓ Show success notification                  │
          │                                                 │
          └──────────────────┬──────────────────────────────┘
                             │
                    ┌────────▼──────────┐
                    │ Console shows:    │
                    │ ✅ [Utilisateurs] │
                    │    User created   │
                    │    successfully   │
                    │    auth_user_id:  │
                    │    c7688b9c-...   │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────────────┐
                    │  User appears in list    │
                    │  with all permissions    │
                    │  ready to login!         │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │  Modal closes, form      │
                    │  clears, ready for       │
                    │  next user creation      │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼──────────────────┐
                    │  NEW USER READY TO LOGIN │
                    └──────────────────────────┘
```

---

## PART 2: Login Flow (After User Creation)

```
┌──────────────────────────────────────────────────┐
│         LOGIN PAGE                               │
│  ┌────────────────────────────────────────────┐  │
│  │ Email:    [admin@admin.com        ]        │  │
│  │ Password: [***********************]        │  │
│  │                                            │  │
│  │          [LOGIN BUTTON]                    │  │
│  └────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  User clicks     │
        │  LOGIN button    │
        └────────┬─────────┘
                 │
     ┌───────────▼────────────────┐
     │  Frontend: Send request     │
     │  POST /auth/v1/token        │
     │  email: admin@admin.com     │
     │  password: (entered pwd)    │
     └───────────┬────────────────┘
                 │
     ┌───────────▼────────────────────────────┐
     │  Supabase Auth: Verify                 │
     │  1. Find user in auth.users            │
     │  2. Compare password hash              │
     │  3. Generate JWT token                 │
     └───────────┬────────────────────────────┘
                 │
        ┌────────▼──────────────┐
        │  Password matches? ✅ │
        └────────┬──────────────┘
                 │
     ┌───────────▼──────────────────┐
     │  Supabase Auth: Return        │
     │  ┌──────────────────────────┐ │
     │  │ {                        │ │
     │  │   user: {              │ │
     │  │     id: c7688b9c-...,  │ │
     │  │     email: admin@...   │ │
     │  │   },                   │ │
     │  │   session: {           │ │
     │  │     access_token: ...  │ │
     │  │   }                    │ │
     │  │ }                      │ │
     │  └──────────────────────────┘ │
     └───────────┬──────────────────┘
                 │
     ┌───────────▼──────────────────────────┐
     │  Frontend: Got session               │
     │  Store JWT in browser                │
     │  Get auth UUID: c7688b9c-...        │
     └───────────┬──────────────────────────┘
                 │
     ┌───────────▼──────────────────────────┐
     │  Frontend: Query public.users         │
     │  WHERE auth_user_id = c7688b9c-...   │
     └───────────┬──────────────────────────┘
                 │
     ┌───────────▼──────────────────────────┐
     │  Database: Return public.users record │
     │  ┌────────────────────────────────┐   │
     │  │ id: 550e8400-...               │   │
     │  │ name: Administrator            │   │
     │  │ role: admin                    │   │
     │  │ permissions: [...]             │   │
     │  └────────────────────────────────┘   │
     └───────────┬──────────────────────────┘
                 │
     ┌───────────▼──────────────────────────┐
     │  Frontend: Store user context         │
     │  Set: AuthContext.user = {...}        │
     │  Set: permissions = {...}             │
     └───────────┬──────────────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Frontend: Redirect to     │
        │  Dashboard                 │
        │  ✅ Login Successful!      │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  DASHBOARD LOADED         │
        │  ✅ Logged in as:         │
        │     Administrator         │
        │  ✅ Full access granted   │
        └──────────────────────────┘
```

---

## PART 3: Why Manual Creation Fails

```
SCENARIO 1: Manual Creation in Supabase (WRONG)
═══════════════════════════════════════════════

┌──────────────────────┐
│  Supabase Dashboard  │
│  → Auth Users        │
└──────────┬───────────┘
           │
           ▼ User manually creates auth user via Supabase UI
           
┌──────────────────────────────────────────────┐
│ auth.users                                   │
├──────────────────────────────────────────────┤
│ id: c7688b9c-fde3-455a-9f59-42d05cf6acf2   │ ✅ Created
│ email: admin@admin.com                      │ ✅ Set
│ password: (encrypted)                       │ ✅ Set
└──────────────────────────────────────────────┘
           │
           ✅ Auth user exists
           │
           ❌ But wait...
           │
           ▼
┌──────────────────────────────────────────────┐
│ public.users                                 │
├──────────────────────────────────────────────┤
│ (EMPTY - no record created!)                │ ❌ Missing!
└──────────────────────────────────────────────┘
           │
           ▼ Try to login
           
┌─────────────────────────────────────────────┐
│ Login Page                                  │
│ email: admin@admin.com                      │
│ password: AdminSecure123!                   │
│ [LOGIN]                                     │
└──────────────────┬────────────────────────┘
                   │
              ✅ Auth login succeeds
                   │
              ❌ But then...
                   │
          ┌────────▼────────────┐
          │ Supabase tries to   │
          │ verify via RLS:     │
          │                     │
          │ SELECT * FROM       │
          │  public.users       │
          │ WHERE auth_user_id  │
          │  = c7688b9c-...     │
          └────────┬────────────┘
                   │
           ❌ NO RECORD FOUND!
                   │
          ┌────────▼────────────┐
          │ 500 ERROR!          │
          │                     │
          │ "Database error     │
          │  querying schema"   │
          └────────────────────┘


SCENARIO 2: Correct Creation via Application (RIGHT)
═══════════════════════════════════════════════════════

┌──────────────────────┐
│  Utilisateurs Page   │
│  → Nouveau Membre    │
└──────────┬───────────┘
           │
           ▼ Fill form and submit
           
┌──────────────────────────────────────────────┐
│ RPC Function: create_worker_account()        │
│                                              │
│ BEGIN TRANSACTION                           │
│ ├─ Step 1: INSERT auth.users              │
│ │         ✅ Creates                       │
│ │         ✅ auth_user_id: c7688b9c-...   │
│ │                                          │
│ ├─ Step 2: INSERT public.users            │
│ │         ✅ Creates                       │
│ │         ✅ Links via auth_user_id       │
│ │                                          │
│ ├─ Step 3: INSERT permissions             │
│ │         ✅ Creates                       │
│ │                                          │
│ └─ COMMIT ALL                              │
│    ✅ All-or-nothing                       │
│    ✅ Both tables in sync                  │
└──────────────────────────────────────────────┘
           │
           ▼ Try to login
           
┌─────────────────────────────────────────────┐
│ Login Page                                  │
│ email: admin@admin.com                      │
│ password: AdminSecure123!                   │
│ [LOGIN]                                     │
└──────────────────┬────────────────────────┘
                   │
              ✅ Auth login succeeds
                   │
              ✅ RLS verification:
                   │
          ┌────────▼────────────┐
          │ SELECT * FROM       │
          │  public.users       │
          │ WHERE auth_user_id  │
          │  = c7688b9c-...     │
          │                     │
          │ ✅ RECORD FOUND!    │
          └────────┬────────────┘
                   │
        ┌──────────▼──────────┐
        │ All checks pass ✅  │
        │ JWT generated ✅    │
        │ Redirect to dash ✅ │
        └──────────────────────┘
```

---

## PART 4: Database Record Linking

```
TWO SEPARATE DATABASES / TABLES:
═══════════════════════════════════

┌─────────────────────────────────┐
│  SUPABASE AUTH                  │
│  (auth schema)                  │
│                                 │
│  auth.users                     │
│  ═══════════════════════════════ │
│  id: c7688b9c-...          ◄─┐  │
│  email: admin@admin.com        │  │
│  encrypted_password: $2b$...   │  │
│  raw_user_meta_data: {...}     │  │
│                             │  │
└─────────────────────────────┼──┘
                              │
                    LINKS VIA │ auth_user_id
                              │
┌─────────────────────────────┼──────────────────┐
│  YOUR APPLICATION DATABASE  │                  │
│  (public schema)            │                  │
│                             │                  │
│  public.users               │                  │
│  ═══════════════════════════════════════════  │
│  id: 550e8400-...           │                  │
│  name: Administrator        │                  │
│  username: admin            │                  │
│  email: admin@admin.com     │                  │
│  role: admin                │                  │
│  status: active             │                  │
│  auth_user_id: c7688b9c-..─┘                  │
│                                                │
│  ┌───────────────────────────────────────┐   │
│  │ user_permissions                      │   │
│  ├─────────────┬────────────────────────┤   │
│  │ user_id     │ permission_key         │   │
│  ├─────────────┼────────────────────────┤   │
│  │ 550e8400-.. │ view_dashboard         │   │
│  │ 550e8400-.. │ view_ventes            │   │
│  │ 550e8400-.. │ view_achats            │   │
│  │ ... many more                        │   │
│  └─────────────┴────────────────────────┘   │
│                                                │
└────────────────────────────────────────────────┘

LOGIN FLOW USING BOTH:
═══════════════════════

1. User enters credentials (email + password)
   
2. Supabase Auth checks:
   - Find record in auth.users WHERE email = input_email ✓
   - Verify password hash ✓
   - Return auth.users.id (= auth_user_id) ✓
   
3. Frontend stores JWT token
   
4. Frontend queries public.users:
   - Find record WHERE auth_user_id = JWT.sub ✓
   - Get user data, role, permissions ✓
   - Store in React Context ✓
   
5. RLS Policies verify:
   - User has valid JWT ✓
   - public.users record exists for this JWT ✓
   - Allow access to other tables ✓
   
✅ LOGIN SUCCESSFUL!

WHY BOTH TABLES ARE NEEDED:
════════════════════════════

auth.users:
  • Authentication (verify email + password)
  • Session management (JWT tokens)
  • Email verification
  • Password reset
  • 2FA setup
  
public.users:
  • Application-specific user data (name, role)
  • Permissions management
  • User profile info
  • Activity tracking
  • Custom fields

They work together via auth_user_id linking!
```

---

## PART 5: What to Do Next

```
YOUR SITUATION:
═══════════════

Current State:
  ✅ Application is built correctly
  ✅ RPC function creates both records
  ✅ Everything is automated
  
Your Challenge:
  ❓ You manually created auth user
  ❌ Forgot to create public.users record
  ❌ Login fails with 500 error

SOLUTION PATH:
═══════════════

┌─────────────────────────────┐
│  DELETE BROKEN USER         │
├─────────────────────────────┤
│  DELETE FROM auth.users     │
│    WHERE email = '...';     │
│  DELETE FROM public.users   │
│    WHERE email = '...';     │
└────────────┬────────────────┘
             │
┌────────────▼─────────────────┐
│  RECREATE VIA APPLICATION    │
├─────────────────────────────┤
│  1. Go to Utilisateurs      │
│  2. Click "Nouveau Membre"  │
│  3. Fill form completely    │
│  4. Click "Create"          │
└────────────┬────────────────┘
             │
┌────────────▼─────────────────┐
│  VERIFY IN CONSOLE          │
├─────────────────────────────┤
│  Check for:                 │
│  ✅ auth_user_id logged     │
│  ✅ Success message         │
│  ✅ User in list            │
└────────────┬────────────────┘
             │
┌────────────▼─────────────────┐
│  TEST LOGIN                 │
├─────────────────────────────┤
│  1. Logout from dashboard   │
│  2. Go to login page        │
│  3. Enter email + password  │
│  4. Click login             │
│  ✅ Should work!            │
└────────────┬────────────────┘
             │
┌────────────▼─────────────────┐
│  SUCCESS! 🎉               │
│  User can login normally    │
└─────────────────────────────┘
```

---

**That's the complete picture! Your application is designed perfectly.**
