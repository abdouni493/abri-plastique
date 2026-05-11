/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * IMPROVED WORKER CREATION MODAL
 * 
 * Replace the form section in Utilisateurs.tsx with this component.
 * This provides a professional interface similar to Sales, Purchases, and Bon de Commande.
 */

import React from 'react';
import { X, User, Mail, Lock, Phone, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreateWorkerModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  formData: {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: 'admin' | 'worker';
  };
  setFormData: (data: any) => void;
  handleAddUser: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  saveError: string | null;
  editingUserId: string | null;
}

const CreateWorkerModal: React.FC<CreateWorkerModalProps> = ({
  showModal,
  setShowModal,
  formData,
  setFormData,
  handleAddUser,
  saving,
  saveError,
  editingUserId,
}) => {
  const isEditMode = !!editingUserId;

  const inputClasses = `
    w-full px-4 py-3 rounded-xl
    bg-white border-2 border-gray-200
    focus:border-teal-500 focus:ring-2 focus:ring-teal-100
    outline-none transition-all
    font-medium text-gray-800
    placeholder-gray-400
  `;

  const selectClasses = `
    w-full px-4 py-3 rounded-xl
    bg-white border-2 border-gray-200
    focus:border-teal-500 focus:ring-2 focus:ring-teal-100
    outline-none transition-all
    font-medium text-gray-800
  `;

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !saving && setShowModal(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 px-8 py-6 rounded-t-3xl border-b-2 border-teal-700/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-xl">
                      <User className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">
                        {isEditMode ? 'Modifier Membre' : 'Nouveau Membre'}
                      </h2>
                      <p className="text-teal-100 text-sm font-semibold">
                        {isEditMode ? 'Modifier les informations du membre' : 'Ajouter un nouveau membre à l\'équipe'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !saving && setShowModal(false)}
                    disabled={saving}
                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Error Alert */}
                {saveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-bold text-red-800">Erreur</p>
                      <p className="text-red-700 text-sm">{saveError}</p>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleAddUser} className="space-y-6">
                  {/* Row 1: Name & Username */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <User size={16} className="text-teal-600" />
                        Nom Complet
                      </label>
                      <input
                        type="text"
                        placeholder="ex: John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputClasses}
                        disabled={saving}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <User size={16} className="text-cyan-600" />
                        Nom d'Utilisateur
                      </label>
                      <input
                        type="text"
                        placeholder="ex: john_doe"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={inputClasses}
                        disabled={saving || isEditMode}
                        required
                      />
                      {isEditMode && <p className="text-xs text-gray-500 mt-1">Non modifiable</p>}
                    </div>
                  </div>

                  {/* Row 2: Email & Phone */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Mail size={16} className="text-teal-600" />
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="ex: john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={inputClasses}
                        disabled={saving || isEditMode}
                        required
                      />
                      {isEditMode && <p className="text-xs text-gray-500 mt-1">Non modifiable</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Phone size={16} className="text-cyan-600" />
                        Téléphone (Optionnel)
                      </label>
                      <input
                        type="tel"
                        placeholder="ex: +212 612 345 678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={inputClasses}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Row 3: Password & Role */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Lock size={16} className="text-teal-600" />
                        Mot de Passe {isEditMode && '(Laisser vide pour ne pas changer)'}
                      </label>
                      <input
                        type="password"
                        placeholder="Min 6 caractères"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={inputClasses}
                        disabled={saving}
                        required={!isEditMode}
                        minLength={6}
                      />
                      <p className={`text-xs mt-1 font-semibold ${
                        formData.password.length === 0
                          ? 'text-gray-400'
                          : formData.password.length < 6
                          ? 'text-red-500'
                          : 'text-green-600'
                      }`}>
                        {formData.password.length === 0
                          ? 'Min 6 caractères requis'
                          : formData.password.length < 6
                          ? `${formData.password.length}/6 — trop court`
                          : `✓ ${formData.password.length} caractères`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Shield size={16} className="text-cyan-600" />
                        Rôle
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'worker' })}
                        className={selectClasses}
                        disabled={saving}
                        required
                      >
                        <option value="worker">Ouvrier (Accès Limité)</option>
                        <option value="admin">Administrateur (Accès Total)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.role === 'worker' ? '✓ Accès Caisse seulement' : '✓ Accès complet'}
                      </p>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-semibold text-blue-900 text-sm">
                          {isEditMode ? 'Modification' : 'Création'} du compte automatique
                        </p>
                        <p className="text-blue-700 text-xs mt-1">
                          {isEditMode 
                            ? 'Les informations de connexion seront mises à jour.'
                            : 'Le compte de connexion sera créé automatiquement avec Supabase Auth.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => !saving && setShowModal(false)}
                      disabled={saving}
                      className="flex-1 px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition-all disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:shadow-lg text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {isEditMode ? 'Modification...' : 'Création...'}
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          {isEditMode ? 'Modifier' : 'Créer'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateWorkerModal;
