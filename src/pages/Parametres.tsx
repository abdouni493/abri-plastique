/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, User, Landmark, LayoutGrid, 
  Shield, Database, Save, Upload, 
  Trash2, Plus, X, Image as ImageIcon, 
  Lock, Bell, AlertTriangle, Download, PieChart
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { uploadLogo } from '../lib/storage';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { ProductCategoriesManager } from '../components/ProductCategoriesManager';

const Parametres = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { 
    banks, addBank, deleteBank, settings, updateSettings, 
    categories, addCategory, deleteCategory,
    divisions, addDivision, deleteDivision, transactions, loading
  } = useApp();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );
  
  const [activeTab, setActiveTab] = useState('general');
  const [newBank, setNewBank] = useState({ name: '', code: '' });
  const [newDivision, setNewDivision] = useState({ name: '', percentage: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Local state for settings to avoid null warnings and handle controlled inputs correctly
  const [localSettings, setLocalSettings] = useState<any>({});

  // Sync local settings when global settings load
  React.useEffect(() => {
    if (settings) {
      setLocalSettings({
        name: settings.name || '',
        phone: settings.phone || '',
        address: settings.address || '',
        city: settings.city || '',
        zip: settings.zip || '',
        rip: settings.rip || '',
        nif: settings.nif || '',
        rs: settings.rs || '',
        article: settings.article || '',
        validationThreshold: settings.validationThreshold ?? 100000,
        lowCashAlertThreshold: settings.lowCashAlertThreshold ?? 50000,
      });
    }
  }, [settings]);

  // Show notification with auto-dismiss
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Wrapper for updateSettings with notification for explicit saves
  const updateSettingsWithNotification = async (data: any) => {
    try {
      await updateSettings(data);
      showNotification('success', 'Paramètres mis à jour');
    } catch (error) {
      showNotification('error', 'Erreur lors de la mise à jour');
      console.error('Error updating settings:', error);
    }
  };

  const totalCaisse = transactions
    .filter(t => t.source === 'caisse')
    .reduce((acc, t) => acc + (t.type === 'in' ? t.amount : -t.amount), 0);

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newBank.name || !newBank.code) {
        showNotification('error', 'Veuillez remplir tous les champs');
        return;
      }
      await addBank(newBank);
      setNewBank({ name: '', code: '' });
      showNotification('success', 'Banque ajoutée avec succès');
    } catch (error) {
      showNotification('error', 'Erreur lors de l\'ajout de la banque');
      console.error('Error adding bank:', error);
    }
  };

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivision.name || !newDivision.percentage) {
      showNotification('error', 'Veuillez remplir tous les champs');
      return;
    }
    
    // Check if total percentage doesn't exceed 100
    const currentTotal = divisions.reduce((acc, d) => acc + d.percentage, 0);
    const requested = parseFloat(newDivision.percentage);
    
    if (currentTotal + requested > 100) {
      showNotification('error', 'Le total des pourcentages ne peut pas dépasser 100%');
      return;
    }

    try {
      await addDivision({
        name: newDivision.name,
        percentage: requested
      });
      setNewDivision({ name: '', percentage: '' });
      showNotification('success', 'Division créée avec succès');
    } catch (error) {
      showNotification('error', 'Erreur lors de la création de la division');
      console.error('Error adding division:', error);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profil Utilisateur', icon: User },
    { id: 'general', label: 'Entreprise & Général', icon: Landmark },
    { id: 'cash', label: 'Gestion des Caisses', icon: PieChart },
    { id: 'resources', label: 'Ressources (Banques/Cat.)', icon: LayoutGrid },
    { id: 'security', label: 'Sécurité & Alertes', icon: Shield },
    { id: 'data', label: 'Données & Sauvegarde', icon: Database },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Paramètres
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Configuration globale et préférences système</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => updateSettingsWithNotification(localSettings)}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/40 transition-all w-full md:w-auto"
        >
          <Save size={20} />
          Confirmer tout
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[700px]">
        {/* Settings Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02, x: 8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold",
                activeTab === item.id 
                  ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-slate-600 text-white shadow-xl shadow-indigo-500/20" 
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 shadow-sm"
              )}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-gradient-to-br from-white to-indigo-50/20 rounded-3xl border border-indigo-100/50 shadow-xl overflow-hidden p-10"
        >
           {activeTab === 'general' && (
             <div className="space-y-10 animate-in fade-in duration-300">
                <div className="flex items-center gap-8 pb-8 border-b border-indigo-100/30">
                   <div className="flex flex-col items-center gap-4 w-full md:w-auto">
                      <div className="relative group">
                        {settings.logo ? (
                          <img src={settings.logo} alt="Logo" className="w-32 h-32 object-contain rounded-2xl border border-indigo-200 shadow-lg" />
                        ) : (
                          <div className="w-32 h-32 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center text-indigo-600 text-4xl font-black border border-indigo-200 shadow-lg">
                            {settings.name?.[0] || 'E'}
                          </div>
                        )}
                        {uploadingLogo && (
                          <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <motion.label
                        whileHover={{ scale: uploadingLogo ? 1 : 1.05 }}
                        whileTap={{ scale: uploadingLogo ? 1 : 0.95 }}
                        className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload size={16} />
                        {uploadingLogo ? 'Upload en cours...' : 'Changer le logo'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          disabled={uploadingLogo}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingLogo(true);
                            try {
                              const url = await uploadLogo(file);
                              if (url) {
                                await updateSettings({ logo: url });
                                setLocalSettings({ ...localSettings, logo: url });
                                showNotification('success', 'Logo mis à jour avec succès');
                              } else {
                                showNotification('error', 'Le fichier est trop volumineux (Max 3Mo) ou invalide');
                              }
                            } catch (error) {
                              console.error('Error uploading logo:', error);
                              showNotification('error', 'Erreur lors du téléchargement du logo');
                            } finally {
                              setUploadingLogo(false);
                            }
                          }}
                        />
                      </motion.label>
                      <p className="text-sm text-gray-500 text-center">
                        Logo affiché sur les rapports, factures, la barre latérale et la page de connexion.<br/>
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Taille maximale : 3 Mo • PNG, JPG, WebP</span>
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Informations Générales</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-2 block">Nom de l'Entreprise</label>
                          <input 
                            type="text" 
                            value={localSettings.name || ''} 
                            onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
                            onBlur={() => updateSettings({ name: localSettings.name })}
                            placeholder="Entrez le nom de votre entreprise"
                            className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-2 block">Numéro de Téléphone</label>
                          <input 
                            type="text" 
                            value={localSettings.phone || ''} 
                            onChange={(e) => setLocalSettings({ ...localSettings, phone: e.target.value })}
                            onBlur={() => updateSettings({ phone: localSettings.phone })}
                            placeholder="Numéro de téléphone"
                            className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-2 block">Adresse</label>
                          <input 
                            type="text" 
                            value={localSettings.address || ''} 
                            onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                            onBlur={() => updateSettings({ address: localSettings.address })}
                            placeholder="Adresse complète"
                            className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Identité Fiscale</h5>
                      <div className="grid grid-cols-2 gap-4 space-y-0">
                         <div>
                           <label className="text-xs font-bold text-gray-700 mb-2 block">Ville</label>
                           <input 
                             type="text" 
                             value={localSettings.city || ''} 
                             onChange={(e) => setLocalSettings({ ...localSettings, city: e.target.value })}
                             onBlur={() => updateSettings({ city: localSettings.city })}
                             placeholder="Ville"
                             className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                           />
                         </div>
                         <div>
                           <label className="text-xs font-bold text-gray-700 mb-2 block">Code Postal</label>
                           <input 
                             type="text" 
                             value={localSettings.zip || ''} 
                             onChange={(e) => setLocalSettings({ ...localSettings, zip: e.target.value })}
                             onBlur={() => updateSettings({ zip: localSettings.zip })}
                             placeholder="Code Postal"
                             className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                           />
                         </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-2 block">RIP Bancaire Principal</label>
                        <input 
                          type="text" 
                          value={localSettings.rip || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, rip: e.target.value })}
                          onBlur={() => updateSettings({ rip: localSettings.rip })}
                          placeholder="00000 00000 0000000000 00" 
                          className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-mono font-bold tracking-widest text-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-2 block">NIF (Fiscal)</label>
                        <input 
                          type="text" 
                          value={localSettings.nif || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, nif: e.target.value })}
                          onBlur={() => updateSettings({ nif: localSettings.nif })}
                          placeholder="Numéro d'Identification Fiscale"
                          className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                        />
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'cash' && (
             <div className="space-y-10 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-8 border-b border-indigo-100/30">
                   <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-1">Répartition de la Caisse</h4>
                      <p className="text-sm text-gray-600">Divisez votre solde de caisse réel en différentes parties logiques.</p>
                   </div>
                   <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-6 py-4 text-center">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Solde Total Caisse</p>
                      <p className="text-2xl font-black text-indigo-600">
                        {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(totalCaisse)}
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ajouter une Division</h5>
                      <form onSubmit={handleAddDivision} className="p-8 bg-indigo-50/30 border border-indigo-200 rounded-2xl space-y-4">
                         <div>
                            <label className="text-xs font-bold text-gray-700 mb-2 block">Nom de la Division</label>
                            <input 
                              type="text" 
                              value={newDivision.name}
                              onChange={(e) => setNewDivision({...newDivision, name: e.target.value})}
                              placeholder="Ex: Profis, Réserve..." 
                              className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-gray-700 mb-2 block">Pourcentage (%)</label>
                            <input 
                              type="number" 
                              max="100"
                              min="0"
                              value={newDivision.percentage}
                              onChange={(e) => setNewDivision({...newDivision, percentage: e.target.value})}
                              placeholder="10" 
                              className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                            />
                         </div>
                         <motion.button
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           type="submit"
                           className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
                         >
                            Créer la Division
                         </motion.button>
                      </form>
                      
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                         <p className="text-xs font-bold text-amber-700 uppercase tracking-wider leading-relaxed">
                            Note: La somme des divisions ne peut excéder 100%. Le reste constitue le fond de roulement libre.
                         </p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Répartitions Actuelles</h5>
                         <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                            Total: {divisions.reduce((acc, d) => acc + d.percentage, 0)}%
                         </span>
                      </div>
                      
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                         {divisions.map(div => (
                           <motion.div
                             key={div.id}
                             whileHover={{ scale: 1.02, x: 4 }}
                             className="p-5 bg-white border border-indigo-100 rounded-xl group shadow-sm hover:shadow-md transition-all"
                           >
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <p className="text-sm font-bold text-gray-900 uppercase">{div.name}</p>
                                    <p className="text-xs font-semibold text-gray-500 mt-0.5">{div.percentage}% du Solde</p>
                                 </div>
                                 <motion.button
                                   whileHover={{ scale: 1.1 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={() => {
                                      if(window.confirm('Voulez-vous vraiment supprimer cette division ?')) {
                                         deleteDivision(div.id);
                                      }
                                   }}
                                   className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                 >
                                    <Trash2 size={16} />
                                 </motion.button>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                                 <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${div.percentage}%` }}></div>
                              </div>
                              <div className="flex justify-between items-center">
                                 <p className="text-xs font-semibold text-gray-500 uppercase">Valeur</p>
                                 <p className="text-lg font-black text-indigo-600">
                                    {new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(totalCaisse * (div.percentage / 100))}
                                 </p>
                              </div>
                           </motion.div>
                         ))}
                         {divisions.length === 0 && (
                           <div className="text-center py-12 opacity-50">
                              <PieChart size={48} className="mx-auto mb-2 text-gray-300" />
                              <p className="text-sm font-medium text-gray-500">Aucune division active</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'profile' && (
             <div className="space-y-10 animate-in fade-in duration-300">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-6 p-8 bg-indigo-50 rounded-2xl border border-indigo-200"
                >
                   <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg font-black text-2xl">
                      {user?.name?.charAt(0) || 'U'}
                   </div>
                   <div>
                      <h4 className="text-2xl font-bold text-gray-900">{user?.name || 'Utilisateur'}</h4>
                      <p className="text-sm font-semibold text-indigo-600 mt-2 uppercase tracking-wider">{user?.role === 'admin' ? 'Administrateur Général' : 'Membre d\'équipe'}</p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email || ''}</p>
                   </div>
                </motion.div>

                <div className="max-w-md space-y-6">
                   <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Changer le mot de passe</h5>
                   <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-2 block">Mot de passe actuel</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-2 block">Nouveau mot de passe</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                      </div>
                   </div>
                   <motion.button
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-xl transition-all"
                   >
                     Mettre à jour
                   </motion.button>
                </div>
             </div>
           )}

           {activeTab === 'resources' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                 <div className="space-y-6">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Gestion des Catégories de Produits</h4>
                    <ProductCategoriesManager />
                 </div>

                 <div className="border-t border-indigo-100 pt-10" />

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gestion des Banques</h5>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{banks.length} banques</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {banks.map(bank => (
                         <motion.div
                           key={bank.id}
                           whileHover={{ scale: 1.02, x: 4 }}
                           className="p-5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between group shadow-sm hover:shadow-md transition-all"
                         >
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-indigo-50 rounded-lg shadow-sm flex items-center justify-center text-indigo-600">
                                  <Landmark size={18} />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-gray-900">{bank.name}</p>
                                  <p className="text-xs font-semibold text-gray-500 mt-0.5">{bank.code}</p>
                               </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                  if(window.confirm('Supprimer cette banque ?')) {
                                     deleteBank(bank.id);
                                  }
                               }}
                              className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16}/>
                            </motion.button>
                         </motion.div>
                       ))}
                       <div className="p-5 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col gap-3 bg-indigo-50/30">
                          <div className="grid grid-cols-2 gap-2">
                             <input 
                               type="text" 
                               placeholder="Nom Banque" 
                               value={newBank.name} 
                               onChange={(e) => setNewBank({...newBank, name: e.target.value})} 
                               className="bg-white border border-indigo-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" 
                             />
                             <input 
                               type="text" 
                               placeholder="CODE" 
                               value={newBank.code} 
                               onChange={(e) => setNewBank({...newBank, code: e.target.value})} 
                               className="bg-white border border-indigo-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" 
                             />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAddBank}
                            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-lg shadow-indigo-500/20 transition-all"
                          >
                             <Plus size={14} /> Ajouter
                          </motion.button>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Catégories de Flux</h5>
                    <div className="flex flex-wrap gap-2">
                       {categories.map((cat, i) => (
                         <motion.div
                           key={i}
                           whileHover={{ scale: 1.05 }}
                           className="px-4 py-2 bg-white border border-indigo-100 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all group"
                         >
                            <span className="text-xs font-bold text-gray-700">{cat}</span>
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                  if(window.confirm('Supprimer cette catégorie ?')) {
                                     deleteCategory(cat);
                                  }
                               }}
                              className="text-gray-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X size={14}/>
                            </motion.button>
                         </motion.div>
                       ))}
                       <motion.button
                         whileHover={{ scale: 1.05 }}
                         onClick={() => {
                            const name = prompt('Nom de la nouvelle catégorie:');
                            if (name) addCategory(name);
                         }}
                         className="px-4 py-2 border-2 border-dashed border-indigo-300 rounded-xl flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all"
                       >
                          <Plus size={14} />
                          <span className="text-xs font-bold uppercase tracking-wider">Nouveau</span>
                       </motion.button>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'security' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                 <div className="max-w-2xl space-y-8">
                    <div className="space-y-6">
                       <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Seuils de Contrôle</h5>
                       <div>
                          <div className="flex items-center justify-between mb-2">
                             <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                               <Lock size={14} className="text-indigo-600" />
                               Validation automatique limite (DA)
                             </label>
                          </div>
                          <input 
                            type="number" 
                            value={localSettings.validationThreshold ?? 100000} 
                            onChange={(e) => setLocalSettings({ ...localSettings, validationThreshold: parseFloat(e.target.value) })}
                            onBlur={() => updateSettings({ validationThreshold: localSettings.validationThreshold })} 
                            className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold text-lg text-indigo-600 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                          />
                          <p className="text-xs text-gray-500 mt-2">Toute dépense supérieure sera en attente de validation.</p>
                       </div>

                       <div>
                          <div className="flex items-center justify-between mb-2">
                             <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                               <Bell size={14} className="text-amber-600" />
                               Alerte Caisse Basse (DA)
                             </label>
                          </div>
                          <input 
                            type="number" 
                            value={localSettings.lowCashAlertThreshold ?? 50000} 
                            onChange={(e) => setLocalSettings({ ...localSettings, lowCashAlertThreshold: parseFloat(e.target.value) })}
                            onBlur={() => updateSettings({ lowCashAlertThreshold: localSettings.lowCashAlertThreshold })} 
                            className="w-full bg-white border border-indigo-200 rounded-xl py-3 px-4 font-bold text-lg text-amber-600 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                          />
                          <p className="text-xs text-gray-500 mt-2">Seuil déclenchant une alerte visuelle.</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notifications</h5>
                       <motion.div
                         whileHover={{ scale: 1.01 }}
                         className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4"
                       >
                          <AlertTriangle className="text-amber-600 mt-1 shrink-0" size={20} />
                          <div>
                             <p className="text-sm font-bold text-amber-900">Alertes SMS</p>
                             <p className="text-xs text-amber-700 mt-1">Recevez une notification en cas de transaction inhabituelle.</p>
                             <motion.button
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                               className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:shadow-lg shadow-amber-500/20 transition-all"
                             >
                               Configurer SMS
                             </motion.button>
                          </div>
                       </motion.div>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'data' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="p-10 bg-indigo-50 rounded-2xl border border-indigo-200"
                    >
                       <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                          <Database size={32} />
                       </div>
                       <h4 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">Exporter les Données</h4>
                       <p className="text-sm text-gray-600 mb-6">Téléchargez une copie complète au format JSON pour archives ou migrations.</p>
                       <motion.button
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         className="w-full bg-indigo-600 text-white rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-3 hover:shadow-lg shadow-indigo-500/20 transition-all text-sm uppercase tracking-wider"
                       >
                          <Download size={18} /> Télécharger
                       </motion.button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="p-10 bg-gray-50 rounded-2xl border border-gray-200"
                    >
                       <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 mb-6">
                          <Upload size={32} />
                       </div>
                       <h4 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">Restaurer les Données</h4>
                       <p className="text-sm text-gray-600 mb-6">Importez un fichier de sauvegarde pour restaurer vos transactions.</p>
                       <motion.button
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         className="w-full bg-gray-900 text-white rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-3 hover:shadow-lg shadow-gray-900/20 transition-all text-sm uppercase tracking-wider"
                       >
                          <Database size={18} /> Sélectionner
                       </motion.button>
                    </motion.div>
                 </div>
              </div>
           )}
        </motion.div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-lg font-bold text-white flex items-center gap-3',
            notification.type === 'success' 
              ? 'bg-green-500' 
              : 'bg-red-500'
          )}
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
            {notification.type === 'success' ? '✓' : '!'}
          </div>
          {notification.message}
        </motion.div>
      )}
    </div>
  );
};

export default Parametres;
