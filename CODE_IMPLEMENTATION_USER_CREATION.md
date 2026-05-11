# 💻 CODE REFERENCE - User Creation Implementation

## Current Implementation (Already in Your App)

### Frontend Code (src/pages/Utilisateurs.tsx)

```typescript
const handleAddUser = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  setSaveError(null);
  
  try {
    // ─── NEW USER CREATION ───────────────────────────────
    if (!formData.password || formData.password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    console.log('🚀 [Utilisateurs] Calling create_worker_account RPC...', {
      email: formData.email,
      username: formData.username,
      role: formData.role
    });

    // Call the RPC function that creates user in auth + public tables
    const { data, error: rpcError } = await supabase.rpc('create_worker_account', {
      p_email:    formData.email.toLowerCase().trim(),
      p_password: formData.password,
      p_name:     formData.name.trim(),
      p_username: formData.username.toLowerCase().trim(),
      p_phone:    formData.phone || null,
      p_role:     formData.role,
    });

    if (rpcError) {
      console.error('❌ [Utilisateurs] RPC Error:', rpcError);
      throw new Error(rpcError.message || 'Échec de la création du compte');
    }

    if (!data?.success) {
      throw new Error(data?.message || 'Le compte n\'a pas pu être créé.');
    }

    // ✅ SUCCESS - Log the auth_user_id for reference
    console.log('✅ [Utilisateurs] User created successfully via RPC', {
      user_id: data?.user_id,           // ← public.users ID
      auth_user_id: data?.auth_user_id, // ← auth.users ID
      email: formData.email,
      message: data?.message
    });

    // Reload users, close modal, show success
    await loadUsers();
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ 
      name: '', 
      username: '', 
      email: '', 
      phone: '', 
      password: '', 
      role: 'worker' 
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    
  } catch (err: any) {
    const msg = err.message || 'Une erreur est survenue lors de l\'enregistrement';
    console.error('💥 [Utilisateurs] Operation failed:', err);
    setSaveError(msg);
  } finally {
    setSaving(false);
  }
};
```

### Backend RPC Function (PostgreSQL)

The `create_worker_account()` RPC function does all the heavy lifting:

```sql
CREATE FUNCTION public.create_worker_account(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_phone text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
  v_public_user_id uuid;
  v_error_message text;
BEGIN
  -- Validation
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Email is required');
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Password must be at least 6 characters');
  END IF;
  
  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Name is required');
  END IF;

  BEGIN
    -- Step 1: INSERT into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at,
      phone_change_token_new,
      phone_changed_at,
      email_change_token_new,
      email_changed_at,
      last_sign_in_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      LOWER(TRIM(p_email)),
      crypt(p_password, gen_salt('bf')), -- Hash password with bcrypt
      now(), -- Email auto-confirmed
      '{}'::jsonb,
      jsonb_build_object('name', p_name),
      now(),
      now(),
      now(),
      '',
      now(),
      '',
      now(),
      now()
    )
    RETURNING id INTO v_auth_user_id;

    -- Step 2: INSERT into public.users
    INSERT INTO public.users (
      id,
      name,
      username,
      email,
      phone,
      role,
      status,
      auth_user_id
    ) VALUES (
      gen_random_uuid(),
      TRIM(p_name),
      LOWER(TRIM(p_username)),
      LOWER(TRIM(p_email)),
      p_phone,
      p_role::user_role,
      'active'::user_status,
      v_auth_user_id -- Link to auth.users
    )
    RETURNING id INTO v_public_user_id;

    -- Step 3: Grant default permissions
    INSERT INTO public.user_permissions (
      user_id,
      permission_key,
      granted
    )
    SELECT
      v_public_user_id,
      key,
      true
    FROM public.permissions_catalog
    WHERE module IN ('dashboard', 'core');

    -- Success response
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User created successfully',
      'user_id', v_public_user_id,
      'auth_user_id', v_auth_user_id
    );

  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Email or username already exists'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RETURN jsonb_build_object(
      'success', false,
      'message', v_error_message
    );
  END;
END;
$$;
```

---

## Response Object Format

After creating a user, the RPC function returns:

```typescript
{
  success: true,                                    // Always check this
  message: "User created successfully",            // Descriptive message
  user_id: "550e8400-e29b-41d4-a716-446655440000", // public.users ID
  auth_user_id: "c7688b9c-fde3-455a-9f59-42d05cf6acf2" // auth.users ID (THIS IS THE KEY)
}
```

### How to Use the Response

```typescript
// Option 1: Just show success
if (data?.success) {
  console.log('✅ User created!');
}

// Option 2: Save the auth_user_id for logging/debugging
if (data?.success) {
  const authUserId = data.auth_user_id;
  localStorage.setItem(`newly_created_user_${data.user_id}`, authUserId);
  console.log(`Created user with auth_user_id: ${authUserId}`);
}

// Option 3: Create an audit log
if (data?.success) {
  await createAuditLog({
    action: 'USER_CREATED',
    user_id: data.user_id,
    auth_user_id: data.auth_user_id,
    email: formData.email
  });
}
```

---

## Alternative: If You Need to Create User Without RPC

(Not recommended - use RPC instead, but here's how if needed)

```typescript
// ❌ NOT RECOMMENDED - Use RPC instead
// This is for reference only

const createUserManually = async () => {
  // 1. Create auth user
  const { data: authData, error: authError } = 
    await supabase.auth.admin.createUser({
      email: 'admin@admin.com',
      password: 'AdminSecure123!',
      user_metadata: { 
        name: 'Administrator' 
      },
      email_confirm: true, // Auto-confirm email
    });

  if (authError) throw authError;

  const auth_user_id = authData.user.id;
  console.log('✅ Auth user created:', auth_user_id);

  // 2. Create public user
  const { data: publicData, error: publicError } = 
    await supabase
      .from('users')
      .insert({
        name: 'Administrator',
        username: 'admin',
        email: 'admin@admin.com',
        role: 'admin',
        status: 'active',
        auth_user_id: auth_user_id // Link them
      })
      .select()
      .single();

  if (publicError) throw publicError;

  const public_user_id = publicData.id;
  console.log('✅ Public user created:', public_user_id);

  return {
    success: true,
    user_id: public_user_id,
    auth_user_id: auth_user_id
  };
};
```

---

## For Development/Testing: Create Multiple Test Users

```typescript
const createTestUsers = async () => {
  const testUsers = [
    {
      email: 'admin@test.com',
      password: 'AdminTest123!',
      name: 'Admin Test',
      username: 'admin_test',
      role: 'admin'
    },
    {
      email: 'worker1@test.com',
      password: 'Worker123!',
      name: 'Worker One',
      username: 'worker_1',
      role: 'worker'
    },
    {
      email: 'worker2@test.com',
      password: 'Worker123!',
      name: 'Worker Two',
      username: 'worker_2',
      role: 'worker'
    }
  ];

  for (const user of testUsers) {
    const { data, error } = await supabase.rpc('create_worker_account', {
      p_email: user.email,
      p_password: user.password,
      p_name: user.name,
      p_username: user.username,
      p_phone: null,
      p_role: user.role
    });

    if (error) {
      console.error(`❌ Failed to create ${user.email}:`, error);
    } else {
      console.log(`✅ Created ${user.email}`, {
        user_id: data.user_id,
        auth_user_id: data.auth_user_id
      });
    }
  }
};
```

---

## Verify User in Database After Creation

```typescript
// After creating user, verify it exists
const verifyUserCreated = async (email: string) => {
  // Check auth.users
  const { data: authUser } = await supabase
    .from('auth.users')
    .select('id, email')
    .eq('email', email)
    .single();

  // Check public.users
  const { data: publicUser } = await supabase
    .from('users')
    .select('id, email, auth_user_id, role')
    .eq('email', email)
    .single();

  // Check if linked
  const isLinked = authUser?.id === publicUser?.auth_user_id;

  return {
    authUser,
    publicUser,
    isLinked,
    verification: {
      authUserExists: !!authUser,
      publicUserExists: !!publicUser,
      properlyLinked: isLinked,
      allGood: !!authUser && !!publicUser && isLinked
    }
  };
};

// Usage
const result = await verifyUserCreated('admin@admin.com');
if (result.verification.allGood) {
  console.log('✅ User properly set up, can login now');
} else {
  console.error('❌ User setup incomplete:', result);
}
```

---

## Handling Errors During User Creation

```typescript
const handleUserCreationError = (error: any) => {
  // Known error patterns
  if (error.message.includes('unique')) {
    return 'Email or username already exists';
  }
  
  if (error.message.includes('password')) {
    return 'Password must be at least 6 characters';
  }
  
  if (error.message.includes('email')) {
    return 'Please enter a valid email address';
  }
  
  if (error.message.includes('Database error querying schema')) {
    return 'User exists in auth but public.users record missing. Try deleting and recreating.';
  }
  
  if (error.status === 500) {
    return 'Server error. Please try again later.';
  }
  
  return error.message || 'Failed to create user';
};

// Usage in catch block
try {
  // ... create user ...
} catch (error) {
  const friendlyError = handleUserCreationError(error);
  setSaveError(friendlyError);
}
```

---

## TypeScript Types

```typescript
interface CreateUserRequest {
  p_email: string;
  p_password: string;
  p_name: string;
  p_username: string;
  p_phone: string | null;
  p_role: 'admin' | 'worker';
}

interface CreateUserResponse {
  success: boolean;
  message: string;
  user_id?: string;
  auth_user_id?: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: 'admin' | 'worker';
  status: 'active' | 'inactive' | 'suspended';
  auth_user_id: string; // Links to auth.users
  created_at: string;
  updated_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  encrypted_password: string;
}
```

---

## Summary

| Task | Method | Status |
|------|--------|--------|
| Create user via UI | Utilisateurs page | ✅ Implemented |
| Auto-create in auth | RPC function | ✅ Implemented |
| Get auth_user_id | Response object | ✅ Implemented |
| Insert to public.users | RPC function | ✅ Implemented |
| Link tables | RPC function | ✅ Implemented |
| Hash password | bcrypt in RPC | ✅ Implemented |
| Set permissions | RPC function | ✅ Implemented |
| Log auth_user_id | Console logging | ✅ Enhanced |

**Everything is already implemented in your application!** 🎉
