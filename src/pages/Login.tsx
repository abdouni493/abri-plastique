/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Landmark, Lock, User, ShieldCheck, Briefcase, Languages, Mail, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, status, error: authError } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { settings } = useApp();
  const navigate = useNavigate();
  // Prevent double-submit
  const submittingRef = useRef(false);

  // Redirect once auth state machine confirms authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Login] isAuthenticated=true → navigating to dashboard');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Surface profile-level errors from AuthContext (e.g. profile not found)
  useEffect(() => {
    if (status === 'unauthenticated' && authError) {
      setError(authError);
      setLoading(false);
      submittingRef.current = false;
    }
  }, [status, authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');
    setSuccess('');
    setLoading(true);
    submittingRef.current = true;

    try {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        console.error('[Login] login() returned error:', loginError);

        // Distinguish server-side infrastructure errors from wrong credentials
        const isServerError =
          (loginError as any)?.status === 500 ||
          loginError?.message?.includes('querying schema') ||
          loginError?.message?.includes('Database error');

        if (isServerError) {
          setError(
            'Erreur serveur lors de la connexion (500). Contactez l\'administrateur système. ' +
            'Le compte existe mais la configuration Supabase doit être réparée.'
          );
        } else {
          setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
        }

        setLoading(false);
        submittingRef.current = false;
      }
      // On success: loading stays true while AuthContext processes SIGNED_IN event.
      // The useEffect above will fire once isAuthenticated becomes true.
    } catch (err) {
      console.error('[Login] Unexpected exception:', err);
      setError('Une erreur est survenue lors de la connexion.');
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');
    setSuccess('');
    
    // Validate inputs
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    submittingRef.current = true;

    try {
      // Create account as admin with all permissions using the RPC
      const { data, error: rpcError } = await supabase.rpc('create_worker_account', {
        p_email: email.toLowerCase().trim(),
        p_password: password,
        p_name: name.trim(),
        p_username: username.toLowerCase().trim(),
        p_phone: null,
        p_role: 'admin', // Create as admin
      });

      if (rpcError) {
        console.error('❌ [Signup] RPC Error:', rpcError);
        setError(rpcError.message || 'Échec de la création du compte');
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      if (!data?.success) {
        setError(data?.message || 'Le compte n\'a pas pu être créé.');
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      // Success! Auto-login
      setSuccess('Compte créé avec succès ! Connexion en cours...');
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');

      // Auto-login with the new credentials
      setTimeout(async () => {
        const { error: loginError } = await login(email, password);
        if (loginError) {
          console.error('[Signup] Auto-login error:', loginError);
          setError('Compte créé mais erreur lors de la connexion automatique. Veuillez vous connecter manuellement.');
          setLoading(false);
          submittingRef.current = false;
          setIsSignup(false);
        }
      }, 1000);
    } catch (err) {
      console.error('[Signup] Unexpected error:', err);
      setError('Une erreur est survenue lors de la création du compte.');
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const quickLogin = async (role: 'admin' | 'worker') => {
    if (submittingRef.current) return;
    setError('');
    setLoading(true);
    submittingRef.current = true;

    const credentials =
      role === 'admin'
        ? { email: 'admin@admin.com', password: 'admin123' }
        : { email: 'worker@admin.com', password: 'worker123' };

    try {
      const { error: loginError } = await login(credentials.email, credentials.password);
      if (loginError) {
        console.error('[Login] quickLogin error:', loginError);
        setError(
          `Connexion impossible. Vérifiez que le compte existe dans Supabase Auth et la table users. Erreur: ${loginError}`
        );
        setLoading(false);
        submittingRef.current = false;
      }
      // On success: await SIGNED_IN → isAuthenticated → navigate
    } catch (err) {
      console.error('[Login] quickLogin exception:', err);
      setError('Une erreur est survenue lors de la connexion rapide.');
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -ml-48 -mb-48 animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* Language Toggle */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-8 flex bg-white/20 backdrop-blur-lg rounded-full shadow-lg p-1 border border-white/30"
      >
        <button
          onClick={() => setLanguage('fr')}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all",
            language === 'fr' ? "bg-white text-indigo-600 shadow-lg" : "text-white hover:bg-white/10"
          )}
        >
          FR
        </button>
        <button
          onClick={() => setLanguage('ar')}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all font-sans",
            language === 'ar' ? "bg-white text-indigo-600 shadow-lg" : "text-white hover:bg-white/10"
          )}
        >
          العربية
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40">
          <div className="flex flex-col items-center mb-10 text-center">
            <motion.div 
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-6 overflow-hidden border-2 border-white/40 bg-white"
            >
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Landmark className="text-white" size={40} />
                </div>
              )}
            </motion.div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              {settings.name || t('company_name')}
            </h1>
            <p className="text-gray-500 mt-2 font-semibold">{t('login')}</p>
          </div>

          <div className="flex gap-2 mb-8 border-b border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsSignup(false);
                setError('');
                setSuccess('');
              }}
              className={cn(
                "flex-1 pb-3 font-bold text-sm transition-all border-b-2",
                !isSignup
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              )}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                setError('');
                setSuccess('');
              }}
              className={cn(
                "flex-1 pb-3 font-bold text-sm transition-all border-b-2",
                isSignup
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              )}
            >
              Créer un compte
            </button>
          </div>

          {!isSignup ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest ps-1">{t('username')}</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl py-4 ps-12 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                    placeholder="admin@admin.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest ps-1">{t('password')}</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl py-4 ps-12 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl py-4 font-bold text-lg hover:shadow-xl transition-all shadow-lg mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion...' : t('login')}
              </motion.button>

              {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest ps-1">Nom Complet</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl py-4 ps-12 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                    placeholder="Jean Dupont"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest ps-1">Nom d'Utilisateur</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl py-4 ps-12 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                    placeholder="jean_dupont"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest ps-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl py-4 ps-12 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                    placeholder="jean@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest ps-1">Mot de Passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl py-4 ps-12 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                <p className={`text-xs mt-1 font-semibold ${
                  password.length === 0
                    ? 'text-gray-400'
                    : password.length < 6
                    ? 'text-red-500'
                    : 'text-green-600'
                }`}>
                  {password.length === 0
                    ? 'Min 6 caractères requis'
                    : password.length < 6
                    ? `${password.length}/6 — trop court`
                    : `✓ ${password.length} caractères`}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4">
                <p className="text-xs text-blue-700 font-semibold">
                  ℹ️ Votre compte sera créé en tant qu'administrateur avec accès complet à toutes les fonctionnalités.
                </p>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl py-4 font-bold text-lg hover:shadow-xl transition-all shadow-lg mt-6 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                {loading ? 'Création en cours...' : 'Créer un compte'}
              </motion.button>

              {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
              {success && <p className="text-green-600 text-sm text-center mt-2">{success}</p>}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
