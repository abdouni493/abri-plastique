/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Shield, User, 
  Trash2, Edit, X, CheckSquare, 
  Square, Eye, Printer, History, 
  Settings, Lock, Save, AlertCircle,
  Landmark, ArrowLeftRight, Wallet, ShoppingBag, ShoppingCart, Truck, Receipt, 
  Package, Wrench, Clipboard, FileCheck, Plus, FileText, File, UserCircle,
  LayoutDashboard, Users
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import CreateWorkerModal from '../components/CreateWorkerModal';

const Utilisateurs = () => {
  const { t, isRTL } = useLanguage();
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load users from Supabase on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Load permissions reactively when the permissions modal opens
  useEffect(() => {
    if (!showPermissions) {
      setUserPermissions({});
      setSelectedModes({ caisse: false, commercial: false });
      return;
    }

    const user = users.find(u => u.id === showPermissions);
    if (!user?.user_permissions) return;

    const perms: Record<string, boolean> = {};
    const modes = { caisse: false, commercial: false };

    user.user_permissions.forEach((perm: any) => {
      perms[perm.permission_key] = perm.granted;
      if (caisseInterfaces.some(i => i.id === perm.permission_key)) modes.caisse = true;
      if (commercialInterfaces.some(i => i.id === perm.permission_key)) modes.commercial = true;
    });

    setUserPermissions(perms);
    setSelectedModes(modes);
  }, [showPermissions, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('*, user_permissions(permission_key, granted)')
        .order('name');
      if (data) setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'worker' as 'admin' | 'worker',
  });

  const availablePermissions = [
    { id: 'view_dashboard', label: 'Voir Tableau de bord' },
    { id: 'view_caisse', label: 'Voir Caisse' },
    { id: 'create_transaction', label: 'Créer Transactions' },
    { id: 'edit_transaction', label: 'Modifier Transactions' },
    { id: 'delete_transaction', label: 'Supprimer Transactions' },
    { id: 'view_bank', label: 'Voir Banque' },
    { id: 'view_transfer', label: 'Voir Transferts' },
    { id: 'view_sales', label: 'Voir Ventes' },
    { id: 'view_purchases', label: 'Voir Achats & Dettes' },
    { id: 'pay_debts', label: 'Régler Dettes' },
    { id: 'view_clients', label: 'Gérer Clients' },
    { id: 'view_suppliers', label: 'Gérer Fournisseurs' },
    { id: 'view_expenses', label: 'Gérer Dépenses' },
    { id: 'view_reports', label: 'Générer Rapports' },
    { id: 'print_docs', label: 'Imprimer Documents' },
  ];

  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [permissionTab, setPermissionTab] = useState<'interfaces' | 'actions'>('interfaces');
  const [selectedModes, setSelectedModes] = useState<{ caisse: boolean; commercial: boolean }>({ caisse: false, commercial: false });

  // Caisse mode interfaces
  const caisseInterfaces = [
    { id: 'view_dashboard',  label: 'Tableau de bord',    icon: LayoutDashboard },
    { id: 'view_caisse',     label: 'Caisse',             icon: Wallet },
    { id: 'view_bank',       label: 'Banque',             icon: Landmark },
    { id: 'view_transfer',   label: 'Transferts',         icon: ArrowLeftRight },
    { id: 'view_sales',      label: 'Ventes',             icon: ShoppingBag },
    { id: 'view_purchases',  label: 'Achats & Dettes',    icon: ShoppingCart },
    { id: 'view_clients',    label: 'Clients',            icon: Users },
    { id: 'view_suppliers',  label: 'Fournisseurs',       icon: Truck },
    { id: 'view_expenses',   label: 'Dépenses',           icon: Receipt },
    { id: 'view_users',      label: 'Utilisateurs',       icon: UserCircle },
    { id: 'view_reports',    label: 'Rapports',           icon: FileText },
    { id: 'view_settings',   label: 'Paramètres',         icon: Settings },
  ];

  // Commercial mode interfaces
  const commercialInterfaces = [
    { id: 'view_dashboard',    label: 'Dashboard',          icon: LayoutDashboard },
    { id: 'view_sales',        label: 'Ventes',             icon: ShoppingBag },
    { id: 'view_purchases',    label: 'Achats & Dettes',    icon: ShoppingCart },
    { id: 'view_clients',      label: 'Clients',            icon: Users },
    { id: 'view_suppliers',    label: 'Fournisseurs',       icon: Truck },
    { id: 'view_stockage',     label: 'Stockage',           icon: Package },
    { id: 'view_production',   label: 'Production',         icon: Wrench },
    { id: 'view_bon_commande', label: 'Bon de Commande',    icon: Clipboard },
    { id: 'view_bon_livraison',label: 'Bon de Livraison',   icon: FileCheck },
    { id: 'view_bon_reception',label: 'Bon de Réception',   icon: File },
    { id: 'view_proformat',    label: 'Facture Proformat',  icon: FileText },
    { id: 'view_inventaire',   label: 'Inventaire',         icon: Package },
    { id: 'view_users',        label: 'Utilisateurs',       icon: UserCircle },
    { id: 'view_reports',      label: 'Rapports',           icon: FileText },
    { id: 'view_settings',     label: 'Paramètres',         icon: Settings },
  ];

  const actionPermissions = [
    { id: 'action_create',    label: 'Créer',               icon: Plus,       color: 'emerald' },
    { id: 'action_edit',      label: 'Modifier',            icon: Edit,       color: 'blue' },
    { id: 'action_delete',    label: 'Supprimer',           icon: Trash2,     color: 'red' },
    { id: 'action_print',     label: 'Imprimer',            icon: Printer,    color: 'purple' },
    { id: 'action_pay_debts', label: 'Régler les dettes',   icon: CheckSquare,color: 'amber' },
  ];

  const selectAll = () => {
    const allIds: Record<string, boolean> = {};
    if (permissionTab === 'interfaces') {
      if (selectedModes.caisse) caisseInterfaces.forEach(i => { allIds[i.id] = true; });
      if (selectedModes.commercial) commercialInterfaces.forEach(i => { allIds[i.id] = true; });
    } else {
      actionPermissions.forEach(i => { allIds[i.id] = true; });
    }
    setUserPermissions(prev => ({ ...prev, ...allIds }));
  };

  const deselectAll = () => {
    const cleared = { ...userPermissions };
    if (permissionTab === 'interfaces') {
      if (selectedModes.caisse) caisseInterfaces.forEach(i => delete cleared[i.id]);
      if (selectedModes.commercial) commercialInterfaces.forEach(i => delete cleared[i.id]);
    } else {
      actionPermissions.forEach(i => delete cleared[i.id]);
    }
    setUserPermissions(cleared);
  };

  const togglePermission = (id: string) => {
    setUserPermissions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      password: '', // Keep empty for security unless changing
      role: user.role,
    });
    setShowModal(true);
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    
    try {
      console.log('🚀 [Utilisateurs] Starting user operation...', { editingUserId, email: formData.email });

      if (editingUserId) {
        // ── UPDATE existing user ────────
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUserId);
          
        if (error) throw error;
        console.log('✅ [Utilisateurs] User updated successfully');
      } else {
        // ── CREATE new user via RPC ────────
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }

        console.log('🚀 [Utilisateurs] Calling create_worker_account RPC...', {
          email: formData.email,
          username: formData.username,
          role: formData.role
        });

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
          const errorMsg = data?.error || data?.message || 'Le compte n\'a pas pu être créé.';
          console.error('❌ [Utilisateurs] RPC returned success=false:', data);
          throw new Error(errorMsg);
        }

        // Log the auth_user_id for reference
        console.log('✅ [Utilisateurs] User created successfully via RPC', {
          user_id: data?.user_id,
          auth_user_id: data?.auth_user_id,
          email: formData.email,
          message: data?.message
        });

        // Store auth_user_id for display (optional - for admin reference)
        if (data?.auth_user_id) {
          console.log(`📌 [Utilisateurs] Save this auth_user_id for reference: ${data.auth_user_id}`);
        }
      }

      // Success cleanup
      await loadUsers();
      setShowModal(false);
      setEditingUserId(null);
      setFormData({ name: '', username: '', email: '', phone: '', password: '', role: 'worker' });
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Supprimer ${userName} ? Cette action supprimera aussi le compte de connexion.`)) return;
    try {
      // Uses the SECURITY DEFINER function which deletes both auth.users and public.users atomically
      const { error } = await supabase.rpc('delete_worker_account', {
        p_public_user_id: userId,
      });
      if (error) throw new Error(error.message);
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[Utilisateurs] Delete error:', msg);
      alert(`Erreur lors de la suppression: ${msg}`);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Utilisateurs
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gestion des accès et permissions de l'équipe</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingUserId(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-teal-500/40 transition-all w-full md:w-auto"
        >
          <UserPlus size={20} />
          Nouveau Membre
        </motion.button>
      </motion.div>

      {/* Success Banner */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-800 font-semibold"
        >
          <CheckSquare size={20} className="text-green-600" />
          Compte créé avec succès !
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl hover:shadow-teal-500/40 transition-all col-span-2"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <span className="text-xs font-bold uppercase tracking-widest">Total Membres</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight">{users.length}</h2>
            <div className="mt-4 flex gap-4">
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Administrateurs</p>
                <p className="text-lg font-black">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Travailleurs</p>
                <p className="text-lg font-black">{users.filter(u => u.role === 'worker').length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-teal-50/30 rounded-3xl p-6 border border-teal-100/50 shadow-xl"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition par Rôle</h3>
          <div className="space-y-3">
            {[
              { role: 'admin', label: 'Administrateurs', color: 'from-teal-600 to-cyan-600' },
              { role: 'worker', label: 'Travailleurs', color: 'from-cyan-600 to-blue-600' }
            ].map(({ role, label, color }) => {
              const count = users.filter(u => u.role === role).length;
              const pct = users.length ? Math.round(count / users.length * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                    <span>{label}</span><span>{count}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={`h-full bg-gradient-to-r ${color} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
      >
        {/* Search Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400" size={16} />
            <input 
              type="text" 
              placeholder="Chercher un membre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gradient-to-br from-white to-teal-50/30 border border-teal-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
              <p className="text-gray-500 font-semibold">Chargement des utilisateurs...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center">
              <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-semibold">Aucun utilisateur trouvé</p>
            </div>
          ) : (
          <table className="w-full text-start">
             <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Membre</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Poste</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filteredUsers.map((user) => (
                 <tr key={user.id} className="hover:bg-teal-50/30 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-none",
                             user.role === 'admin' ? "bg-teal-600 text-white" : "bg-cyan-100 text-cyan-600"
                          )}>
                             {user.name.charAt(0)}
                          </div>
                          <div>
                             <p className="text-base font-black text-gray-900 leading-none">{user.name}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">@{user.username}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold text-gray-700 leading-none">{user.email}</p>
                          <p className="text-[10px] font-mono text-gray-400 font-bold">{user.phone}</p>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                          user.role === 'admin' ? "bg-teal-100 text-teal-700" : "bg-cyan-100 text-cyan-700"
                       )}>
                          {user.role === 'admin' ? 'Administrateur' : 'Travailleur'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                       <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setShowPermissions(user.id)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border",
                              user.user_permissions?.length > 0
                                ? "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                                : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                            )}
                            title="Gérer les permissions"
                          >
                            <Shield size={14} />
                            <span>
                              {user.user_permissions?.length > 0
                                ? `${user.user_permissions.filter((p: any) => p.granted).length} accès`
                                : 'Aucun accès'}
                            </span>
                          </button>
                          <button onClick={() => handleEditUser(user)} className="action-btn-edit" title="Modifier"><Edit size={18}/></button>
                          <button onClick={() => handleDeleteUser(user.id, user.name)} className="action-btn-delete" title="Supprimer"><Trash2 size={18}/></button>
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
          )}
        </div>
      </motion.div>

      {/* Create/Edit Worker Modal */}
      <CreateWorkerModal
        showModal={showModal}
        setShowModal={setShowModal}
        formData={formData}
        setFormData={setFormData}
        handleAddUser={handleAddUser}
        saving={saving}
        saveError={saveError}
        editingUserId={editingUserId}
      />

      {/* Permissions Modal */}
      <AnimatePresence>
        {showPermissions && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPermissions(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center text-white">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Permissions & Accès</h3>
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{users.find(u => u.id === showPermissions)?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowPermissions(null); setUserPermissions({}); }} className="p-2 hover:bg-white rounded-xl shadow-sm text-gray-400 transition-colors"><X size={20}/></button>
                </div>
                
                 <div className="px-10 py-6 bg-gray-50/50 border-b border-gray-100 space-y-6 shrink-0">
                    {/* Mode Selection Redesigned */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modules d'accès</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          onClick={() => setSelectedModes(prev => ({ ...prev, caisse: !prev.caisse }))}
                          className={cn(
                            "relative cursor-pointer rounded-2xl p-5 border-2 transition-all group",
                            selectedModes.caisse
                              ? "border-teal-500 bg-teal-50 shadow-lg shadow-teal-100"
                              : "border-gray-200 bg-white hover:border-teal-300"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                            selectedModes.caisse ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-teal-100 group-hover:text-teal-600"
                          )}>
                            <Wallet size={20} />
                          </div>
                          <p className="font-black text-sm text-gray-900">Mode Caisse</p>
                          <p className="text-[10px] text-gray-500 mt-1">Transactions, Banque, Clients...</p>
                          {selectedModes.caisse && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center shadow-md">
                              <CheckSquare size={12} className="text-white" />
                            </div>
                          )}
                        </div>

                        <div
                          onClick={() => setSelectedModes(prev => ({ ...prev, commercial: !prev.commercial }))}
                          className={cn(
                            "relative cursor-pointer rounded-2xl p-5 border-2 transition-all group",
                            selectedModes.commercial
                              ? "border-cyan-500 bg-cyan-50 shadow-lg shadow-cyan-100"
                              : "border-gray-200 bg-white hover:border-cyan-300"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                            selectedModes.commercial ? "bg-cyan-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-cyan-100 group-hover:text-cyan-600"
                          )}>
                            <Package size={20} />
                          </div>
                          <p className="font-black text-sm text-gray-900">Mode Commercial</p>
                          <p className="text-[10px] text-gray-500 mt-1">Stock, BL, Production, Proformat...</p>
                          {selectedModes.commercial && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center shadow-md">
                              <CheckSquare size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tab Buttons and Batch Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setPermissionTab('interfaces')}
                          className={cn(
                            "px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                            permissionTab === 'interfaces' ? "bg-slate-900 text-white shadow-lg" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                          )}
                        >
                          Interfaces
                        </button>
                        <button 
                          onClick={() => setPermissionTab('actions')}
                          className={cn(
                            "px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                            permissionTab === 'actions' ? "bg-slate-900 text-white shadow-lg" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                          )}
                        >
                          Actions
                        </button>
                      </div>

                      <div className="flex gap-4 items-center">
                        <button onClick={selectAll} className="text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest transition-colors">
                          Tout cocher
                        </button>
                        <div className="w-px h-3 bg-gray-200" />
                        <button onClick={deselectAll} className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors">
                          Tout décocher
                        </button>
                      </div>
                    </div>
                 </div>
                
                 <div className="flex-1 overflow-y-auto p-10 bg-white">
                    {permissionTab === 'interfaces' ? (
                      <div className="space-y-8">
                         {selectedModes.caisse && (
                           <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em]">Interfaces Caisse</h4>
                             <div className="grid grid-cols-2 gap-4">
                               {caisseInterfaces.map((item) => (
                                 <div 
                                   key={item.id} 
                                   onClick={() => togglePermission(item.id)}
                                   className={cn(
                                     "flex items-center justify-between cursor-pointer group p-4 rounded-2xl border-2 transition-all",
                                     userPermissions[item.id] ? "border-teal-500 bg-teal-50/30" : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                                   )}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className={cn(
                                         "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                         userPermissions[item.id] ? "bg-teal-600 text-white shadow-md" : "bg-white text-gray-400 border border-gray-100"
                                       )}>
                                          <item.icon size={16} />
                                       </div>
                                       <span className={cn(
                                         "text-xs font-bold transition-colors",
                                         userPermissions[item.id] ? "text-teal-900" : "text-gray-600"
                                       )}>{item.label}</span>
                                    </div>
                                    <div className={cn(
                                      "w-10 h-5 rounded-full transition-all relative shrink-0",
                                      userPermissions[item.id] ? "bg-teal-500" : "bg-gray-200"
                                    )}>
                                      <div className={cn(
                                        "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                                        userPermissions[item.id] ? "left-5.5" : "left-0.5"
                                      )} />
                                    </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                        
                         {selectedModes.commercial && (
                           <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em]">Interfaces Commercial</h4>
                             <div className="grid grid-cols-2 gap-4">
                               {commercialInterfaces.map((item) => (
                                 <div 
                                   key={item.id} 
                                   onClick={() => togglePermission(item.id)}
                                   className={cn(
                                     "flex items-center justify-between cursor-pointer group p-4 rounded-2xl border-2 transition-all",
                                     userPermissions[item.id] ? "border-cyan-500 bg-cyan-50/30" : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                                   )}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className={cn(
                                         "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                         userPermissions[item.id] ? "bg-cyan-600 text-white shadow-md" : "bg-white text-gray-400 border border-gray-100"
                                       )}>
                                          <item.icon size={16} />
                                       </div>
                                       <span className={cn(
                                         "text-xs font-bold transition-colors",
                                         userPermissions[item.id] ? "text-cyan-900" : "text-gray-600"
                                       )}>{item.label}</span>
                                    </div>
                                    <div className={cn(
                                      "w-10 h-5 rounded-full transition-all relative shrink-0",
                                      userPermissions[item.id] ? "bg-cyan-500" : "bg-gray-200"
                                    )}>
                                      <div className={cn(
                                        "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                                        userPermissions[item.id] ? "left-5.5" : "left-0.5"
                                      )} />
                                    </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}

                         {!selectedModes.caisse && !selectedModes.commercial && (
                           <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                             <Shield className="mx-auto text-gray-300 mb-4" size={48} />
                             <p className="text-gray-500 font-bold">Activez au moins un module pour configurer les interfaces</p>
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                         {actionPermissions.map((item) => (
                           <div 
                             key={item.id} 
                             onClick={() => togglePermission(item.id)}
                             className={cn(
                               "flex items-center justify-between cursor-pointer group p-5 rounded-2xl border-2 transition-all",
                               userPermissions[item.id] ? `border-${item.color}-500 bg-${item.color}-50/30` : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                             )}
                           >
                              <div className="flex items-center gap-4">
                                 <div className={cn(
                                   "w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0",
                                   userPermissions[item.id] ? `bg-${item.color}-600 text-white shadow-lg` : "bg-white text-gray-400 border border-gray-100"
                                 )}>
                                    <item.icon size={20} />
                                 </div>
                                 <div>
                                   <p className={cn(
                                     "text-sm font-black transition-colors leading-none",
                                     userPermissions[item.id] ? `text-${item.color}-900` : "text-gray-700"
                                   )}>{item.label}</p>
                                   <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">Permission globale</p>
                                 </div>
                              </div>
                              <div className={cn(
                                "w-11 h-6 rounded-full transition-all relative shrink-0",
                                userPermissions[item.id] ? `bg-${item.color}-500` : "bg-gray-200"
                              )}>
                                <div className={cn(
                                  "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-md",
                                  userPermissions[item.id] ? "left-5.5" : "left-0.5"
                                )} />
                              </div>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>

                <div className="p-10 border-t border-gray-100 shrink-0">
                   <button 
                     onClick={async () => {
                       try {
                         if (!showPermissions) return;
                         
                         // Build the list of permissions to insert
                         const permissionsToInsert = Object.entries(userPermissions)
                           .filter(([, granted]) => granted)
                           .map(([permission_key]) => ({
                             user_id: showPermissions,
                             permission_key,
                             granted: true,
                           }));
                         
                         // Confirm before deleting all permissions
                         if (permissionsToInsert.length === 0) {
                           const confirmed = window.confirm(
                             'Aucune permission sélectionnée. Cet utilisateur n\'aura accès à rien. Continuer ?'
                           );
                           if (!confirmed) return;
                         }
                         
                         // Delete existing permissions first
                         await supabase.from('user_permissions').delete().eq('user_id', showPermissions);
                         
                         // Insert new permissions only if there are any
                         if (permissionsToInsert.length > 0) {
                           const { error } = await supabase.from('user_permissions').insert(permissionsToInsert);
                           if (error) {
                             console.error('Error saving permissions:', error);
                             alert('Erreur lors de la sauvegarde des permissions');
                             return;
                           }
                         }
                         
                         await loadUsers();
                         setShowPermissions(null);
                         setUserPermissions({});
                       } catch (error) {
                         console.error('Error saving permissions:', error);
                         alert('Erreur lors de la sauvegarde des permissions');
                       }
                     }}
                     className="w-full bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:shadow-teal-500/40"
                   >
                     <Save size={20} />
                     Enregistrer les permissions
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Utilisateurs;