/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fournisseurs — Professional Supplier Management Interface
 * Redesigned with same architecture as Inventaire/Ventes
 * Color Scheme: Orange/Amber/Yellow
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus, Search, Edit, Trash2, Printer, Eye, X,
  Warehouse, TrendingUp, TrendingDown, Calendar, Phone, Check,
  Mail, MapPin, AlertCircle, Clock, CreditCard, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

// Import types from types.ts
import { Supplier, Appointment } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA';

const genId = () => Math.random().toString(36).substr(2, 9);

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  actif: { label: 'Actif', color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-400' },
  inactif: { label: 'Inactif', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  suspendu: { label: 'Suspendu', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-400' },
};

// ─── Appointment Modals ───────────────────────────────────────────────────────

function AppointmentModal({ supplier, onClose, onSave }: {
  supplier: Supplier;
  onClose: () => void;
  onSave: (a: Omit<Appointment, 'id'>) => Promise<void>;
}) {
  const [type, setType] = useState<'verser' | 'percevoir'>('verser');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hour, setHour] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    await onSave({
      type,
      amount: Number(amount),
      date,
      hour,
      notes,
      supplier_id: supplier.id,
      status: 'pending'
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between text-white">
          <h3 className="text-lg font-black flex items-center gap-2"><Calendar size={20} /> Rendez-vous — {supplier.name}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-orange-50 rounded-xl border border-orange-100">
            <button onClick={() => setType('verser')} className={`py-2 rounded-lg text-xs font-black transition-all ${type === 'verser' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Donner Argent</button>
            <button onClick={() => setType('percevoir')} className={`py-2 rounded-lg text-xs font-black transition-all ${type === 'percevoir' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Prendre Argent</button>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Montant (DA)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Heure</label>
              <input type="time" value={hour} onChange={e => setHour(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Note</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none resize-none" placeholder="Motif du rendez-vous..." />
          </div>
          <button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Confirmer le Rendez-vous'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AppointmentHistoryModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { appointments, updateAppointment, deleteAppointment } = useApp();
  const supplierAppts = appointments.filter(a => a.supplier_id === supplier.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-8 py-6 flex items-center justify-between text-white shrink-0">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2"><Clock size={24} /> Historique des Rendez-vous</h3>
            <p className="text-orange-100 text-xs font-bold opacity-80 uppercase tracking-widest">{supplier.name}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-gray-50/50">
          {supplierAppts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Aucun rendez-vous trouvé</p>
            </div>
          ) : (
            supplierAppts.map(appt => (
              <div key={appt.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center justify-between hover:border-orange-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${appt.type === 'percevoir' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {appt.type === 'percevoir' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{new Intl.NumberFormat('fr-DZ').format(appt.amount)} DA</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{appt.date} à {appt.hour} · {appt.type === 'percevoir' ? 'Percevoir' : 'Verser'}</p>
                    {appt.notes && <p className="text-xs text-gray-600 mt-1 italic">"{appt.notes}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={appt.status}
                    onChange={(e) => updateAppointment(appt.id, { status: e.target.value as any })}
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer ${
                      appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <option value="pending">En attente</option>
                    <option value="completed">Complété</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                  <button onClick={() => { if(window.confirm('Supprimer?')) deleteAppointment(appt.id) }} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ supplier, onClose }: {
  supplier: Supplier;
  onClose: () => void;
}) {
  const st = STATUS_MAP[supplier.status || 'actif'];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto"
      >
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{supplier.name}</h2>
            <p className="text-orange-200 text-sm font-semibold mt-0.5">Fournisseur depuis {new Date(supplier.dateCreated).toLocaleDateString('fr-DZ')}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Téléphone</p>
              <p className="text-lg font-bold text-gray-900">{supplier.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-lg font-bold text-gray-900">{supplier.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Wilaya</p>
              <p className="text-lg font-bold text-gray-900">{supplier.wilaya || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Statut</p>
              <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${st.bg} ${st.color}`}>
                {st.label}
              </span>
            </div>
          </div>

          <div className="bg-orange-50/30 rounded-2xl border border-orange-100 p-6 mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informations Supplémentaires</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">N° Contribuable:</span>
                <span className="text-sm font-bold text-gray-900">{supplier.taxId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Total Fournitures:</span>
                <span className="text-sm font-bold text-orange-700">{fmt(supplier.totalSupplies || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Total Dû:</span>
                <span className={`text-sm font-bold ${(supplier.totalDebt || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(supplier.totalDebt || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Commune:</span>
                <span className="text-sm font-bold text-gray-900">{supplier.commune || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Adresse:</span>
                <span className="text-sm font-bold text-gray-900">{supplier.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          {supplier.notes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-4 mb-6">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700">{supplier.notes}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-orange-100 bg-orange-50/30 flex justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-500 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 hover:shadow-xl transition-all"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

const SupplierForm: React.FC<{
  supplier?: Supplier;
  onClose: () => void;
  onSave: (s: Supplier) => void;
}> = function({ supplier, onClose, onSave }) {
  const isNew = !supplier;

  const [form, setForm] = useState<Supplier>(
    supplier || {
      id: genId(),
      name: '',
      contact: '',
      phone: '',
      email: '',
      fax: '',
      address: '',
      city: '',
      zip: '',
      taxId: '',
      nif: '',
      nis: '',
      article: '',
      rs: '',
      activite: '',
      wilaya: '',
      commune: '',
      famille: '',
      sousFamille: '',
      rcNumber: '',
      artNumber: '',
      ifNumber: '',
      isNumber: '',
      compteBancaire: '',
      rib: '',
      siteWeb: '',
      soldeInitial: 0,
      dateInitial: '',
      status: 'actif',
      dateCreated: new Date().toISOString().split('T')[0],
      totalSupplies: 0,
      totalDebt: 0,
      notes: '',
    }
  );

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -40 }}
        className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900">{isNew ? 'Nouveau' : 'Modifier'} Fournisseur</h2>
            <p className="text-gray-400 text-sm font-semibold mt-0.5">{form.name || 'Nouveau fournisseur'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-8 space-y-6 flex-1">
          {/* ─── Section: Informations de Base ─── */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 pb-2 border-b border-orange-200">Informations de Base</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nom Fournisseur*</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Téléphone*</label>
                <input
                  required
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact</label>
                <input
                  value={form.contact || ''}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fax</label>
                <input
                  value={form.fax || ''}
                  onChange={e => setForm(f => ({ ...f, fax: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activité</label>
                <input
                  value={form.activite || ''}
                  onChange={e => setForm(f => ({ ...f, activite: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ─── Section: Localisation ─── */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 pb-2 border-b border-orange-200">Localisation</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Adresse</label>
              <input
                value={form.address || ''}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ville</label>
                <input
                  value={form.city || ''}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Code Postal</label>
                <input
                  value={form.zip || ''}
                  onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wilaya</label>
                <input
                  value={form.wilaya || ''}
                  onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Commune</label>
                <input
                  value={form.commune || ''}
                  onChange={e => setForm(f => ({ ...f, commune: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ─── Section: Catégorisation ─── */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 pb-2 border-b border-orange-200">Catégorisation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Famille</label>
                <input
                  value={form.famille || ''}
                  onChange={e => setForm(f => ({ ...f, famille: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sous-Famille</label>
                <input
                  value={form.sousFamille || ''}
                  onChange={e => setForm(f => ({ ...f, sousFamille: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Site Web</label>
                <input
                  type="url"
                  value={form.siteWeb || ''}
                  onChange={e => setForm(f => ({ ...f, siteWeb: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ─── Section: Documents & Identification ─── */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 pb-2 border-b border-orange-200">Documents & Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Contribuable</label>
                <input
                  value={form.taxId || ''}
                  onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">NIF</label>
                <input
                  value={form.nif || ''}
                  onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">NIS</label>
                <input
                  value={form.nis || ''}
                  onChange={e => setForm(f => ({ ...f, nis: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Raison Sociale (RS)</label>
                <input
                  value={form.rs || ''}
                  onChange={e => setForm(f => ({ ...f, rs: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Article</label>
                <input
                  value={form.article || ''}
                  onChange={e => setForm(f => ({ ...f, article: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° RC</label>
                <input
                  value={form.rcNumber || ''}
                  onChange={e => setForm(f => ({ ...f, rcNumber: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° ART</label>
                <input
                  value={form.artNumber || ''}
                  onChange={e => setForm(f => ({ ...f, artNumber: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° IF</label>
                <input
                  value={form.ifNumber || ''}
                  onChange={e => setForm(f => ({ ...f, ifNumber: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° IS</label>
                <input
                  value={form.isNumber || ''}
                  onChange={e => setForm(f => ({ ...f, isNumber: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ─── Section: Informations Financières ─── */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 pb-2 border-b border-orange-200">Informations Financières</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Compte Bancaire</label>
                <input
                  value={form.compteBancaire || ''}
                  onChange={e => setForm(f => ({ ...f, compteBancaire: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">RIB</label>
                <input
                  value={form.rib || ''}
                  onChange={e => setForm(f => ({ ...f, rib: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Solde Initial</label>
                <input
                  type="number"
                  value={form.soldeInitial || 0}
                  onChange={e => setForm(f => ({ ...f, soldeInitial: Number(e.target.value) }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Initial</label>
                <input
                  type="date"
                  value={form.dateInitial || ''}
                  onChange={e => setForm(f => ({ ...f, dateInitial: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Dû</label>
                <input
                  type="number"
                  value={form.totalDebt}
                  onChange={e => setForm(f => ({ ...f, totalDebt: Number(e.target.value) }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Statut</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─── Section: Notes ─── */}
          <div>
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 pb-2 border-b border-orange-200">Observations</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full bg-gradient-to-br from-white to-orange-50/30 border border-orange-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none"
                placeholder="Ajouter des notes..."
              />
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-between shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-500 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 hover:shadow-xl transition-all"
          >
            <Check size={16} />
            Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Supplier Debt Payment Modal ─────────────────────────────────────────────

function SupplierPayDebtModal({ debt, supplier, onClose, onPaid }: {
  debt: any;
  supplier: Supplier;
  onClose: () => void;
  onPaid: () => void;
}) {
  const reste = Math.max(0, debt.total_amount - (debt.paid_amount || 0));
  const [payAmount, setPayAmount] = useState<string>(String(reste));
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Math.min(Number(payAmount) || 0, reste);
  const newPaid = (debt.paid_amount || 0) + amountNum;
  const newReste = Math.max(0, debt.total_amount - newPaid);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Reçu de Paiement — ${debt.invoice_number}</title>
      <style>
        body{font-family:'Segoe UI',Arial;padding:40px;font-size:13px;}
        h1{color:#ea580c;font-size:22px;margin-bottom:4px;}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;}
        .label{color:#666;font-weight:600;}
        .val{font-weight:900;}
        .total{font-size:18px;color:#ea580c;border-top:2px solid #ea580c;padding-top:12px;margin-top:12px;}
      </style></head><body>
      <h1>Reçu de Paiement (Fournisseur)</h1>
      <p style="color:#666;margin-bottom:24px;">Facture: <strong>${debt.invoice_number}</strong> · Fournisseur: <strong>${supplier.name}</strong></p>
      <div class="row"><span class="label">Montant Total Facture</span><span class="val">${new Intl.NumberFormat('fr-DZ').format(debt.total_amount)} DA</span></div>
      <div class="row"><span class="label">Déjà Payé</span><span class="val">${new Intl.NumberFormat('fr-DZ').format(debt.paid_amount || 0)} DA</span></div>
      <div class="row"><span class="label">Ce Paiement</span><span class="val" style="color:#ea580c;">${new Intl.NumberFormat('fr-DZ').format(amountNum)} DA</span></div>
      <div class="row total"><span>Nouveau Solde Restant</span><span>${new Intl.NumberFormat('fr-DZ').format(newReste)} DA</span></div>
      <p style="margin-top:40px;color:#999;font-size:11px;">Imprimé le ${new Date().toLocaleDateString('fr-DZ')}</p>
      <script>window.onload=()=>window.print();</script></body></html>
    `);
    win.document.close();
  };

  const handleSave = async () => {
    if (amountNum <= 0) { setError('Montant invalide'); return; }
    setSaving(true); setError(null);
    try {
      // Add payment record
      await supabase.from('debt_payments').insert({
        debt_id: debt.id,
        amount: amountNum,
        payment_mode: 'especes',
        date: new Date().toISOString().split('T')[0],
        notes: payNote || undefined,
      });

      // Update debt paid_amount
      await supabase.from('debts').update({
        paid_amount: newPaid,
      }).eq('id', debt.id);

      // Also update the achat montant_paye if debt is linked to an achat
      const { data: achat } = await supabase.from('achats').select('id, total_ttc').eq('numero', debt.invoice_number).eq('supplier_id', supplier.id).maybeSingle();
      if (achat) {
        const newStatus = newPaid >= achat.total_ttc ? 'payé' : 'dette';
        await supabase.from('achats').update({
          montant_paye: newPaid,
          status: newStatus
        }).eq('id', achat.id);
      }

      onPaid();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2"><CreditCard size={20} />Payer la Dette</h2>
            <p className="text-orange-200 text-xs font-semibold mt-0.5">{debt.invoice_number} · {supplier.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={18} /></button>
        </div>

        <div className="p-7 space-y-4">
          <div className="bg-orange-50/60 rounded-2xl border border-orange-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Total Facture</span>
              <span className="font-black text-gray-900">{new Intl.NumberFormat('fr-DZ').format(debt.total_amount)} DA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Déjà Payé</span>
              <span className="font-black text-orange-700">{new Intl.NumberFormat('fr-DZ').format(debt.paid_amount || 0)} DA</span>
            </div>
            <div className="flex justify-between text-sm border-t border-orange-200 pt-2">
              <span className="text-gray-700 font-bold">Reste à Payer</span>
              <span className="font-black text-red-700 text-base">{new Intl.NumberFormat('fr-DZ').format(reste)} DA</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Montant à payer maintenant</label>
            <input
              type="number" min="0" max={reste}
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              className="w-full border-2 border-orange-400 rounded-xl py-3 px-4 text-lg font-black text-orange-700 focus:ring-4 focus:ring-orange-500/20 outline-none text-right"
            />
          </div>

          {amountNum > 0 && (
            <div className={`rounded-xl p-4 border-2 ${
              newReste <= 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-orange-50 border-orange-300 text-orange-800'
            }`}>
              <div className="flex justify-between text-sm font-bold">
                <span>Nouveau solde restant:</span>
                <span className="text-lg">{new Intl.NumberFormat('fr-DZ').format(newReste)} DA</span>
              </div>
              {newReste <= 0 && <p className="text-xs font-bold mt-1">✅ Facture soldée intégralement!</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Note (optionnel)</label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Ex: Virement, chèque n°..."
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-4 focus:ring-orange-500/20 outline-none" />
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">{error}</div>}
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <button onClick={handlePrint}
            className="flex-none flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all">
            <Printer size={16} />Imprimer
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || amountNum <= 0}
            className="flex-1 py-3 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 text-white font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
            {saving ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Supplier History Modal ───────────────────────────────────────────────────

function SupplierHistoryModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const [achats, setAchats] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadHistory(); }, [supplier.id]);

  const loadHistory = async () => {
    setLoading(true);
    const [achatsRes, debtsRes] = await Promise.all([
      supabase.from('achats').select('*').eq('supplier_id', supplier.id).order('date', { ascending: false }),
      supabase.from('debts').select('*, debt_payments(*)').eq('supplier_id', supplier.id).order('date', { ascending: false }),
    ]);
    if (achatsRes.data) setAchats(achatsRes.data);
    if (debtsRes.data) setDebts(debtsRes.data);
    setLoading(false);
  };

  const totalAchats = achats.reduce((s, a) => s + (a.total_ttc || 0), 0);
  const totalDettes = debts.reduce((s, d) => s + Math.max(0, d.total_amount - d.paid_amount), 0);
  const [payingDebt, setPayingDebt] = useState<any | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2"><Clock size={20} />Historique — {supplier.name}</h2>
            <p className="text-orange-200 text-sm font-semibold mt-0.5">Achats, dettes et paiements</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={20} /></button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 text-white">
                  <p className="text-xs font-bold opacity-75 uppercase tracking-wider mb-1">Total Achats</p>
                  <p className="text-2xl font-black">{fmt(totalAchats)}</p>
                  <p className="text-xs opacity-75 mt-1">{achats.length} facture(s)</p>
                </div>
                <div className={`rounded-2xl p-5 text-white ${
                  totalDettes > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                }`}>
                  <p className="text-xs font-bold opacity-75 uppercase tracking-wider mb-1">Total Dettes</p>
                  <p className="text-2xl font-black">{fmt(totalDettes)}</p>
                  <p className="text-xs opacity-75 mt-1">{debts.filter(d => d.total_amount > d.paid_amount).length} impayée(s)</p>
                </div>
              </div>

              <AnimatePresence>
                {payingDebt && (
                  <SupplierPayDebtModal
                    debt={payingDebt}
                    supplier={supplier}
                    onClose={() => setPayingDebt(null)}
                    onPaid={loadHistory}
                  />
                )}
              </AnimatePresence>

              {/* Debts */}
              {debts.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertCircle size={14} className="text-red-500" />Dettes</h3>
                  <div className="space-y-2">
                    {debts.map(debt => {
                      const remaining = debt.total_amount - (debt.paid_amount || 0);
                      const isPaid = remaining <= 0;
                      return (
                        <div key={debt.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                          isPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                        }`}>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{debt.invoice_number || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{new Date(debt.date).toLocaleDateString('fr-DZ')} · Total: {fmt(debt.total_amount)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-black text-sm ${isPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                                {isPaid ? '✅ Soldé' : fmt(remaining)}
                              </p>
                              {!isPaid && <p className="text-xs text-gray-500">Payé: {fmt(debt.paid_amount || 0)}</p>}
                            </div>
                            {!isPaid && (
                              <button onClick={() => { setPayingDebt(debt); }}
                                className="px-3 py-1.5 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-lg text-xs font-bold shadow hover:shadow-orange-400/40 transition-all">
                                Payer
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Purchases list */}
              <div>
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-orange-500" />Historique des Achats</h3>
                {achats.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucun achat enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {achats.map(a => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-xl">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{a.numero}</p>
                          <p className="text-xs text-gray-500">{new Date(a.date).toLocaleDateString('fr-DZ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-orange-700">{fmt(a.total_ttc)}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            a.status === 'livree' ? 'bg-emerald-100 text-emerald-700' :
                            a.status === 'commande' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{a.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-8 py-5 border-t border-orange-100 bg-orange-50/30 flex justify-end">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">Fermer</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FournisseursPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addAppointment } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | undefined>();
  const [historySupplier, setHistorySupplier] = useState<Supplier | undefined>();
  const [appointingSupplier, setAppointingSupplier] = useState<Supplier | undefined>();
  const [historyApptSupplier, setHistoryApptSupplier] = useState<Supplier | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = suppliers.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = (supplier: Supplier) => {
    if (editingSupplier) {
      updateSupplier(supplier);
    } else {
      addSupplier(supplier);
    }
    setShowForm(false);
    setEditingSupplier(undefined);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      deleteSupplier(id);
      setViewingSupplier(undefined);
    }
  };

  const totalSupplies = suppliers.reduce((s, sp) => s + (sp.totalSupplies || 0), 0);
  const totalDebt = suppliers.reduce((s, sp) => s + (sp.totalDebt || 0), 0);
  const activeCount = suppliers.filter(s => s.status === 'actif').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 bg-clip-text text-transparent">
            Fournisseurs
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gestion complète des fournisseurs et approvisionnements</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingSupplier(undefined); setShowForm(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-orange-500/40 transition-all w-full md:w-auto"
        >
          <Plus size={20} />
          Nouveau Fournisseur
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl hover:shadow-orange-500/40 transition-all col-span-2"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <span className="text-xs font-bold uppercase tracking-widest">Total Fournitures Cumulés</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight">{fmt(totalSupplies)}</h2>
            <div className="mt-4 flex gap-4">
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Total Fournisseurs</p>
                <p className="text-lg font-black">{suppliers.length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Actifs</p>
                <p className="text-lg font-black">{activeCount}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Total Dû</p>
                <p className="text-lg font-black">{fmt(totalDebt)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-orange-50/30 rounded-3xl p-6 border border-orange-100/50 shadow-xl"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition par statut</h3>
          <div className="space-y-3">
            {Object.entries(STATUS_MAP).map(([key, val]) => {
              const count = suppliers.filter(s => s.status === key).length;
              const pct = suppliers.length ? Math.round(count / suppliers.length * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                    <span>{val.label}</span><span>{count}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-white to-orange-50/20 rounded-3xl border border-orange-100/50 shadow-xl overflow-hidden"
      >
        {/* Table Header */}
        <div className="p-6 md:p-8 border-b border-orange-100/50 bg-gradient-to-r from-orange-50/50 to-amber-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-900">Liste des Fournisseurs</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom ou téléphone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm font-medium focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 outline-none shadow-sm"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Warehouse className="w-16 h-16 text-orange-200 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold mb-2">
              {suppliers.length === 0 ? 'Aucun fournisseur créé' : 'Aucun résultat trouvé'}
            </p>
            {suppliers.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="text-orange-600 hover:text-orange-700 font-bold text-sm"
              >
                Créer le premier fournisseur
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-50/80 to-amber-50/50 border-b border-orange-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Téléphone</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Wilaya</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Fourni</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Dû</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/50">
                {filtered.map(supplier => (
                  <motion.tr
                    key={supplier.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-orange-50/50 transition-all"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{supplier.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{supplier.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{supplier.wilaya || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-orange-700">
                      {fmt(supplier.totalSupplies || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      <span className={(supplier.totalDebt || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}>
                        {fmt(supplier.totalDebt || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setHistorySupplier(supplier)}
                          className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                          title="Historique"
                        >
                          <Clock size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewingSupplier(supplier)}
                          className="p-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-all"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setEditingSupplier(supplier); setShowForm(true); }}
                          className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setHistoryApptSupplier(supplier)}
                          className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                          title="Historique des rendez-vous"
                        >
                          <Clock size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setAppointingSupplier(supplier)}
                          className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all"
                          title="Rendez-vous"
                        >
                          <Calendar size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (window.confirm('Êtes-vous sûr ?')) handleDelete(supplier.id);
                          }}
                          className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <SupplierForm
            supplier={editingSupplier}
            onClose={() => { setShowForm(false); setEditingSupplier(undefined); }}
            onSave={handleSave}
          />
        )}
        {viewingSupplier && (
          <ViewModal
            supplier={viewingSupplier}
            onClose={() => setViewingSupplier(undefined)}
          />
        )}
        {historySupplier && (
          <SupplierHistoryModal
            supplier={historySupplier}
            onClose={() => setHistorySupplier(undefined)}
          />
        )}
        {appointingSupplier && (
          <AppointmentModal
            supplier={appointingSupplier}
            onClose={() => setAppointingSupplier(undefined)}
            onSave={addAppointment}
          />
        )}
        {historyApptSupplier && (
          <AppointmentHistoryModal
            supplier={historyApptSupplier}
            onClose={() => setHistoryApptSupplier(undefined)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}