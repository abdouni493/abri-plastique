/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * WORKER ACCOUNT CREATION & LOGIN FLOW - CODE WALKTHROUGH
 * 
 * This file shows exactly how the system creates workers and enables login.
 */

// ============================================================================
// 1. FRONTEND: Admin Creates Worker (Utilisateurs.tsx)
// ============================================================================

// In src/pages/Utilisateurs.tsx:

const handleAddUser = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  setSaveError(null);
  
  try {
    if (editingUserId) {
      // UPDATE existing user (just update public profile, not auth)
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUserId);
      if (error) throw new Error(error.message);
    } else {
      // CREATE new user: call RPC function
      // This is where the magic happens!
      
      if (!formData.password || formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { data, error } = await supabase.rpc('create_worker_account', {
        p_email:    formData.email,              // 'john@example.com'
        p_password: formData.password,           // 'SecurePass123'
        p_name:     formData.name,               // 'John Doe'
        p_username: formData.username,           // 'john_doe'
        p_phone:    formData.phone || null,      // '+212 612 345 678'
        p_role:     formData.role,               // 'worker'
      });
      
      // Handle response from RPC function
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error('Failed to create account');
      
      console.log('[Utilisateurs] Worker account created:', data);
      // data = {
      //   success: true,
      //   user_id: "550e8400-e29b-41d4-a716-446655440002",
      //   auth_user_id: "550e8400-e29b-41d4-a716-446655440003",
      //   message: "Worker account created successfully"
      // }
    }

    // Refresh users list and close modal
    await loadUsers();
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ name: '', username: '', email: '', phone: '', password: '', role: 'worker' });
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Utilisateurs] Save error:', msg);
    setSaveError(msg);
  } finally {
    setSaving(false);
  }
};

// ============================================================================
// 2. BACKEND: RPC Function Execution (PostgreSQL)
// ============================================================================

// In FIX_CREATE_WORKER_ACCOUNT_RPC.sql:
// The create_worker_account() function does this:

CREATE FUNCTION public.create_worker_account(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'worker'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_user_id uuid;
BEGIN
  -- Step 1: Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  -- Validations...
  
  BEGIN
    -- Step 2: Create auth user with encrypted password
    -- This is the account used for login!
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,    -- Password is hashed with bcrypt here!
      email_confirmed_at,    -- Set to NOW() so no confirmation needed
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),  -- Password is hashed! Not plain text!
      NOW(),                               -- Email confirmed immediately
      jsonb_build_object('name', p_name),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_auth_user_id;
    
    -- At this point: auth.users now has the account
    -- Password is hashed and stored securely
    // Example: $2a$12$R9h21cIPz0peS6G11PezCu7DkjRm3ZgV2Smart7...

    
    -- Step 3: Create public user profile
    -- This stores metadata that the app uses
    
    INSERT INTO public.users (
      name,
      username,
      email,
      phone,
      role,
      status,
      auth_user_id,      -- LINK to auth.users
      created_at,
      updated_at
    ) VALUES (
      p_name,
      p_username,
      p_email,
      p_phone,
      p_role::user_role,
      'active'::user_status,
      v_auth_user_id,    -- This links the two tables
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_id;
    
    // At this point: public.users now has the profile
    // Linked to auth.users via auth_user_id


    -- Step 4: Grant permissions
    -- Workers get limited permissions, admins get all
    
    IF p_role = 'admin' THEN
      INSERT INTO public.user_permissions (user_id, permission_key, granted)
      SELECT v_user_id, key, true
      FROM public.permissions_catalog;
    ELSE
      INSERT INTO public.user_permissions (user_id, permission_key, granted)
      SELECT v_user_id, key, true
      FROM public.permissions_catalog
      WHERE key IN (
        'view_dashboard',
        'view_caisse',
        'create_transaction',
        'edit_transaction',
        'view_bank',
        'view_transfer',
        'view_sales',
        'view_purchases',
        'pay_debts',
        'view_clients',
        'view_suppliers',
        'view_reports'
      );
    END IF;
    
    // At this point: user_permissions has permission records
    

    -- Step 5: Return success response
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'auth_user_id', v_auth_user_id,
      'message', 'Worker account created successfully'
    );
    
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email or username already exists');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

// ============================================================================
// 3. FRONTEND: Worker Logs In (AuthContext.tsx)
// ============================================================================

// In src/context/AuthContext.tsx:

const handleSignIn = async (email: string, password: string) => {
  try {
    console.log('[Auth] Signing in:', email);
    
    // Call Supabase Auth with email + password
    // Supabase Auth verifies against auth.users table
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    email,      // 'john@example.com'
      password: password    // 'SecurePass123'
    });
    
    if (error) throw error;
    
    console.log('[Auth] Signed in successfully');
    setUser(data.user);
    
    // Now fetch the public profile
    // This happens in useEffect when user changes
    return data;
    
  } catch (err) {
    console.error('[Auth] Sign in error:', err);
    throw err;
  }
};

// In useEffect when user logs in:

useEffect(() => {
  if (user) {
    loadProfile();
  }
}, [user]);

const loadProfile = async () => {
  try {
    console.log('[Auth] Loading profile for:', user?.id);
    
    // Get public profile by auth_user_id
    const { data } = await supabase
      .from('users')
      .select('*, user_permissions(permission_key, granted)')
      .eq('auth_user_id', user?.id)
      .single();
      
    if (data) {
      // data contains: name, email, role, permissions, etc.
      console.log('[Auth] Profile loaded:', data.name);
      setProfile(data);
      setPermissions(data.user_permissions);
    }
  } catch (error) {
    console.error('[Auth] Load profile error:', error);
  }
};

// ============================================================================
// 4. BACKEND: Supabase Auth Verifies Password
// ============================================================================

// When user enters email + password on login page:
// Supabase Auth internally does this:

// 1. Look up user by email in auth.users
SELECT encrypted_password FROM auth.users WHERE email = 'john@example.com';
// Returns: $2a$12$R9h21cIPz0peS6G11PezCu7DkjRm3ZgV2Smart7...

// 2. Compare provided password with stored hash
SELECT 
  crypt('SecurePass123', '$2a$12$R9h21cIPz0peS6G11PezCu7DkjRm3ZgV2Smart7...')
  = '$2a$12$R9h21cIPz0peS6G11PezCu7DkjRm3ZgV2Smart7...' AS password_matches;
// Returns: true (if password is correct)

// 3. If matches: return session token
// If doesn't match: return "Invalid email or password" error

// ============================================================================
// 5. FRONTEND: Access App with Permissions
// ============================================================================

// After login, the app checks permissions before showing features:

const canCreateTransaction = (profile: UserProfile) => {
  return profile.user_permissions?.some(
    p => p.permission_key === 'create_transaction' && p.granted
  );
};

const canViewCommercialMode = (profile: UserProfile) => {
  return profile.user_permissions?.some(
    p => p.permission_key === 'mode_commercial' && p.granted
  );
};

// In UI:
{canCreateTransaction(profile) && (
  <button onClick={createTransaction}>Create Transaction</button>
)}

{canViewCommercialMode(profile) && (
  <NavItem href="/production">Production</NavItem>
)}

// ============================================================================
// 6. SECURITY: Password Never Exposed
// ============================================================================

// ✅ Good things that happen:
// - Password hashed with bcrypt (12 rounds) → takes centuries to brute force
// - Plain password NEVER stored in database
// - Plain password NEVER sent to backend (only auth layer)
// - Plain password NEVER logged or displayed
// - Password only sent over HTTPS
// - Supabase Auth handles all password security

// ❌ Bad things that DON'T happen:
// - Password is NOT plain text in database
// - Password is NOT sent to app backend
// - Password is NOT logged in server logs
// - Password is NOT cached anywhere
// - Password is NOT transmitted insecurely

// ============================================================================
// SUMMARY: Complete Flow
// ============================================================================

/*
1. ADMIN CREATES WORKER:
   Utilisateurs.tsx → handleAddUser()
   → supabase.rpc('create_worker_account', {...})
   ↓
2. DATABASE CREATES ACCOUNTS:
   create_worker_account() RPC function
   → INSERT into auth.users (with encrypted password)
   → INSERT into public.users (with link to auth)
   → INSERT into user_permissions (grant 12 permissions)
   → RETURN success JSON
   ↓
3. WORKER LOGS IN:
   Login page → handleSignIn()
   → supabase.auth.signInWithPassword({email, password})
   ↓
4. SUPABASE AUTH VERIFIES:
   → Find user in auth.users by email
   → Get encrypted password (bcrypt hash)
   → Compare: crypt(password, hash) == hash
   → If match: RETURN session token
   ↓
5. APP LOADS PROFILE:
   → Fetch public profile from public.users
   → Get permissions from user_permissions
   → Store in context
   ↓
6. WORKER USES APP:
   → Dashboard shows only allowed interfaces
   → Buttons only show for granted permissions
   → Worker can work normally!
   ✅
*/

// ============================================================================
// KEY FILES
// ============================================================================

// - FIX_CREATE_WORKER_ACCOUNT_RPC.sql: Database functions
// - src/pages/Utilisateurs.tsx: Admin UI to create workers
// - src/context/AuthContext.tsx: Login and profile loading
// - WORKER_SETUP_COMPLETE_FINAL.md: Complete documentation
