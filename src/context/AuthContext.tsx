/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AuthContext — Session-first authentication
 *
 * KEY DESIGN DECISION:
 *   Authentication is determined by the Supabase JWT session alone.
 *   The DB profile (public.users) is loaded in the background and is
 *   NOT required to enter the app. This prevents slow or unreachable
 *   DB queries from blocking the entire auth flow.
 *
 *   - isAuthenticated = true  →  valid Supabase session exists
 *   - user = null             →  profile still loading (or failed)
 *   - user = User             →  profile loaded from DB
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: User | null;
  error?: string;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

// ── Profile cache ──────────────────────────────────────────────────────────────

const profileCache = new Map<string, { user: User; expiresAt: number }>();

function getCached(uid: string): User | null {
  const e = profileCache.get(uid);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { profileCache.delete(uid); return null; }
  return e.user;
}
function setCache(uid: string, u: User) {
  profileCache.set(uid, { user: u, expiresAt: Date.now() + 5 * 60 * 1000 });
}
function clearCache(uid?: string) {
  uid ? profileCache.delete(uid) : profileCache.clear();
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    status: 'initializing',
    user: null,
    profile: null,
  });

  // Prevent concurrent profile fetches for the same user
  const fetchingProfileFor = useRef<string | null>(null);

  // ── Profile fetch (background, non-blocking) ───────────────────────────────

  const loadProfile = useCallback(async (authUserId: string, isMounted: () => boolean) => {
    // Skip if already fetching for this user
    if (fetchingProfileFor.current === authUserId) return;

    const cached = getCached(authUserId);
    if (cached) {
      if (isMounted()) {
        setState(prev =>
          prev.status === 'authenticated' ? { ...prev, user: cached, profile: cached } : prev
        );
      }
      return;
    }

    fetchingProfileFor.current = authUserId;
    console.log('[Auth] Loading profile for:', authUserId);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, phone')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (!isMounted()) return;

      if (error || !data) {
        console.warn('[Auth] Profile not found or error:', error?.message ?? 'empty');
        // Non-fatal: stay authenticated, just no profile data
        return;
      }

      // Fetch permissions (non-critical)
      let permissions: Record<string, boolean> = {};
      try {
        const { data: perms } = await supabase
          .from('user_permissions')
          .select('permission_key, granted')
          .eq('user_id', data.id);
        (perms ?? []).forEach((p: { permission_key: string; granted: boolean }) => {
          permissions[p.permission_key] = p.granted;
        });
      } catch { /* non-critical */ }

      const profile: User = {
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role as UserRole,
        phone: data.phone,
        permissions,
      };

      setCache(authUserId, profile);
      console.log('[Auth] Profile loaded:', profile.username);

      if (isMounted()) {
        setState(prev =>
          prev.status === 'authenticated' ? { ...prev, user: profile, profile } : prev
        );
      }
    } catch (err) {
      console.error('[Auth] loadProfile error:', err);
    } finally {
      fetchingProfileFor.current = null;
    }
  }, []);

  // ── Initialization ─────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    // ── Step 1: Restore session (reads localStorage, very fast) ─────────────
    (async () => {
      console.log('[Auth] Checking session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setState({ status: 'unauthenticated', user: null, profile: null });
          return;
        }

        if (!session?.user) {
          console.log('[Auth] No session found → unauthenticated');
          setState({ status: 'unauthenticated', user: null, profile: null });
          return;
        }

        // ✅ Valid session → authenticated immediately (no DB wait)
        console.log('[Auth] Session found → authenticated (profile loading in background)');
        setState({ status: 'authenticated', user: null, profile: null });

        // Load profile in background — does NOT block auth
        loadProfile(session.user.id, isMounted);

      } catch (err) {
        console.error('[Auth] Session check failed:', err);
        if (mounted) setState({ status: 'unauthenticated', user: null, profile: null });
      }
    })();

    // ── Step 2: Subscribe to auth events ────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log('[Auth] Event:', event, session?.user?.id ?? 'no-user');

      if (event === 'INITIAL_SESSION') return; // handled by getSession above

      if (event === 'SIGNED_OUT') {
        clearCache();
        fetchingProfileFor.current = null;
        setState({ status: 'unauthenticated', user: null, profile: null });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (!session?.user?.id) {
          setState({ status: 'unauthenticated', user: null, profile: null });
          return;
        }
        // Authenticate immediately, load profile in background
        console.log('[Auth] SIGNED_IN → authenticated (profile loading in background)');
        clearCache(session.user.id); // force fresh profile on new login
        setState({ status: 'authenticated', user: null, profile: null });
        loadProfile(session.user.id, isMounted);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] Signing in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.group('❌ [Auth] Login Error Detail');
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        
        if (error.status === 500 || error.message.includes('querying schema')) {
          console.error('💡 ANALYSIS: The worker exists in "auth.users", but the login is failing internally.');
          console.warn('FIX: Run CLONE_ADMIN_AUTH_FIX.sql in Supabase to sync worker settings with the admin.');
        }
        
        console.dir(error);
        console.groupEnd();
        return { error };
      }

      console.log('✅ [Auth] SIGNED_IN successfully:', data.user?.email);
      return { data };
    } catch (err: any) {
      console.error('💥 [Auth] Critical login error:', err);
      return { error: err };
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    clearCache();
    fetchingProfileFor.current = null;
    setState({ status: 'unauthenticated', user: null, profile: null });
    try { await supabase.auth.signOut(); } catch (err) {
      console.error('[Auth] signOut error (ignored):', err);
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    if (state.user.role === 'admin') return true;
    if (state.user.permissions['*']) return true;
    return !!state.user.permissions[permission];
  }, [state.user, state.status]);

  const value: AuthContextType = {
    ...state,
    isAuthenticated: state.status === 'authenticated',
    loading: state.status === 'initializing',
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an <AuthProvider>');
  return context;
};
