import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Diagnostic component to debug login issues
 * Add this to your app temporarily to troubleshoot
 */
export const AuthDiagnostic = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Auth session
      console.log('Test 1: Checking auth session...');
      const { data: { session } } = await supabase.auth.getSession();
      results.hasSession = !!session;
      results.authUser = session?.user?.id;

      // Test 2: Try to query users table
      console.log('Test 2: Querying public.users table...');
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, auth_user_id')
        .limit(1);
      
      results.usersTableOk = !usersError;
      results.usersError = usersError?.message;
      results.userCount = users?.length || 0;
      if (users && users.length > 0) {
        results.sampleUser = users[0];
      }

      // Test 3: Check auth table
      console.log('Test 3: Querying auth.users table...');
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .limit(1);
      
      results.authTableOk = !authError;
      results.authError = authError?.message;

      // Test 4: Try test login
      console.log('Test 4: Attempting test login...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@admin.com',
        password: 'admin123'
      });

      results.loginAttempted = true;
      results.loginError = signInError?.message;
      results.loginUserId = signInData?.user?.id;

      if (signInData?.user) {
        // Test 5: Find matching profile
        console.log('Test 5: Finding matching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, username, email, role')
          .eq('auth_user_id', signInData.user.id)
          .single();

        results.profileFound = !profileError;
        results.profileError = profileError?.message;
        results.profileData = profile;
      }

      setStatus(results);
    } catch (err: any) {
      results.exception = err.message;
      setStatus(results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      backgroundColor: '#1a1a1a',
      color: '#00ff00',
      padding: '20px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '600px',
      overflow: 'auto',
      zIndex: 9999,
      border: '2px solid #00ff00'
    }}>
      <button 
        onClick={runDiagnostics}
        disabled={loading}
        style={{
          backgroundColor: '#00ff00',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          cursor: 'pointer',
          marginBottom: '10px',
          fontWeight: 'bold',
          borderRadius: '4px'
        }}
      >
        {loading ? 'Running...' : 'Run Diagnostics'}
      </button>

      {status && (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default AuthDiagnostic;
