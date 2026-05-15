/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, Printer, Eye, X, FileText,
  ChevronDown, Package, User, Building2, Check, AlertCircle, ArrowRight, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  designation: string;
  refProduct: string;
  barCode: string;
  prixAchatHT: number;
  prixVente: number;
  tva: number;
  currentQuantity: number;
  uniteMesure: string;
  famille: string;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  taxId?: string;
  wilaya?: string;
  commune?: string;
  activite?: string;
  codePostal?: string;
  address?: string;
  notes?: string;
  isSpecial?: boolean;
  specialNote?: string;
}

interface BonLine {
  id: string;
  product: Product;
  quantity: number;
  prixUnitHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
  nbreColis?: number;
  colisage?: number;
}

interface FactureProformat {
  id: string;
  numero: string;
  date: string;
  datelivraison: string;
  client: Client | null;
  lines: BonLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  timbreAmount: number;
  remiseActive: boolean;
  remisePct: number;
  remiseMontant: number;
  status: 'brouillon' | 'confirme' | 'envoye' | 'annule';
  notes: string;
  paymentMode: 'especes' | 'virement' | 'cheque' | 'traite' | 'a_terme';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'decimal', minimumFractionDigits: 2 }).format(n) + ' DA';

const genId = () => Math.random().toString(36).substr(2, 9);

const genNumero = () => `FP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirme: { label: 'Confirmée', color: 'text-blue-700', bg: 'bg-blue-100' },
  envoye: { label: 'Envoyée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  annule: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-100' },
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ProductSearch({ products, onSelect, placeholder = 'Rechercher un produit...' }: {
  products: Product[];
  onSelect: (p: Product) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const results = products.filter(p =>
    p.designation.toLowerCase().includes(query.toLowerCase()) ||
    p.refProduct.toLowerCase().includes(query.toLowerCase()) ||
    p.barCode.includes(query)
  ).slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden"
          >
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.designation}</p>
                  <p className="text-xs text-gray-400 font-semibold">{p.refProduct} · Stock: {p.currentQuantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-amber-600">{formatAmount(p.prixVente)}</p>
                  <p className="text-[10px] text-gray-400">TVA {p.tva}%</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EntitySearch({ entities, onSelect, placeholder, icon: Icon }: {
  entities: Client[];
  onSelect: (e: any) => void;
  placeholder: string;
  icon: React.ElementType;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const results = entities.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden"
          >
            {results.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.wilaya}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

const FactureForm: React.FC<{
  facture?: FactureProformat;
  products: Product[];
  clients: Client[];
  onClose: () => void;
  onSave: (f: FactureProformat) => void;
}> = function({ facture, products, clients, onClose, onSave }) {
  const isNew = !facture;

  const getInitialForm = () => {
    if (facture) return facture;
    return {
      id: genId(),
      numero: genNumero(),
      date: new Date().toISOString().split('T')[0],
      datelivraison: '',
      client: null,
      lines: [],
      totalHT: 0,
      totalTVA: 0,
      totalTTC: 0,
      timbreAmount: 0,
      remiseActive: false,
      remisePct: 0,
      remiseMontant: 0,
      status: 'brouillon' as const,
      notes: '',
      paymentMode: 'virement' as const,
    };
  };

  const [form, setForm] = useState<FactureProformat>(getInitialForm());

  const recalc = (lines: BonLine[]) => {
    const totalHT = lines.reduce((s, l) => s + l.totalHT, 0);
    const totalTVA = lines.reduce((s, l) => s + (l.totalHT * l.tva / 100), 0);
    return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
  };

  const addProduct = (p: Product) => {
    const exists = form.lines.find(l => l.product.id === p.id);
    if (exists) {
      updateLine(exists.id, 'quantity', exists.quantity + 1);
      return;
    }
    const line: BonLine = {
      id: genId(),
      product: p,
      quantity: 1,
      prixUnitHT: p.prixVente,
      tva: p.tva,
      totalHT: p.prixVente,
      totalTTC: p.prixVente * (1 + p.tva / 100),
    };
    const newLines = [...form.lines, line];
    setForm(f => ({ ...f, lines: newLines, ...recalc(newLines) }));
  };

  const updateLine = (id: string, field: string, value: any) => {
    const newLines = form.lines.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      const totalHT = updated.quantity * updated.prixUnitHT;
      const totalTTC = totalHT * (1 + updated.tva / 100);
      return { ...updated, totalHT, totalTTC };
    });
    setForm(f => ({ ...f, lines: newLines, ...recalc(newLines) }));
  };

  const removeLine = (id: string) => {
    const newLines = form.lines.filter(l => l.id !== id);
    setForm(f => ({ ...f, lines: newLines, ...recalc(newLines) }));
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
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
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-auto"
      >
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{isNew ? 'Nouvelle' : 'Modifier'} Facture Proformat</h2>
            <p className="text-orange-200 text-sm font-semibold mt-0.5">{form.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Document</label>
              <input
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Validité</label>
              <input
                type="date"
                value={form.datelivraison}
                onChange={e => setForm(f => ({ ...f, datelivraison: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
              <EntitySearch
                entities={clients}
                onSelect={(c) => setForm(f => ({ ...f, client: c }))}
                placeholder="Rechercher un client..."
                icon={User}
              />
              {form.client && (
                <div className={`mt-2 px-3 py-2 rounded-xl flex items-center justify-between ${form.client.isSpecial ? 'bg-amber-50 border border-amber-200' : 'bg-indigo-50 border border-indigo-200'}`}>
                  <div className="flex items-center gap-2">
                    {form.client.isSpecial && <span className="text-lg">⭐</span>}
                    <span className={`text-sm font-bold ${form.client.isSpecial ? 'text-amber-700' : 'text-indigo-700'}`}>{form.client.name}</span>
                    {form.client.isSpecial && <span className="badge badge-xs bg-amber-200 text-amber-900">Spécial</span>}
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, client: null }))} className={`${form.client.isSpecial ? 'text-amber-400 hover:text-red-500' : 'text-indigo-400 hover:text-red-500'}`}>
                    <X size={14} />
                  </button>
                </div>
              )}
              {form.client?.isSpecial && form.client?.specialNote && (
                <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 italic">
                  📝 {form.client.specialNote}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode de Paiement</label>
              <select
                value={form.paymentMode}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value as any }))}
                className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              >
                <option value="especes">Espèces</option>
                <option value="virement">Virement Bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="traite">Traite</option>
                <option value="a_terme">À terme</option>
              </select>
            </div>

            <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.remiseActive}
                  onChange={e => setForm(f => ({ ...f, remiseActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-bold text-orange-800">Appliquer une remise</span>
              </label>
              {form.remiseActive && (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.remisePct}
                  onChange={e => {
                    const pct = Number(e.target.value);
                    setForm(f => ({
                      ...f,
                      remisePct: pct,
                      remiseMontant: f.totalTTC * pct / 100
                    }));
                  }}
                  className="w-full bg-white border border-orange-200 rounded-lg py-2 px-3 text-sm font-bold text-orange-700 placeholder-orange-300 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                  placeholder="Pourcentage de remise (%)"
                />
              )}
              {form.remiseActive && form.remiseMontant > 0 && (
                <div className="text-sm font-bold text-orange-700 mt-2">
                  - {formatAmount(form.remiseMontant)}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ajouter des Produits</label>
            <ProductSearch products={products} onSelect={addProduct} placeholder="Rechercher par désignation, référence ou code barre..." />
          </div>

          {form.lines.length > 0 ? (
            <div className="bg-gradient-to-br from-amber-50/30 to-orange-50/20 rounded-2xl border border-amber-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-50/80 to-orange-50/50 border-b border-amber-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Désignation</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Quantité</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Nbre Colis</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Colisage</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">P.U HT</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">TVA %</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">Total TTC</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/50">
                    {form.lines.map(line => (
                      <tr key={line.id} className="hover:bg-white/60 transition-all">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{line.product.designation}</p>
                          <p className="text-xs text-gray-400 font-semibold">{line.product.refProduct}</p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                            className="w-full text-center bg-white border border-amber-200 rounded-lg py-1.5 px-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={line.nbreColis || ''}
                            onChange={e => updateLine(line.id, 'nbreColis', Number(e.target.value) || 0)}
                            className="w-full text-center bg-white border border-amber-200 rounded-lg py-1.5 px-2 text-xs font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={line.colisage || ''}
                            onChange={e => updateLine(line.id, 'colisage', Number(e.target.value) || 0)}
                            className="w-full text-center bg-white border border-amber-200 rounded-lg py-1.5 px-2 text-xs font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={line.prixUnitHT}
                              onChange={e => updateLine(line.id, 'prixUnitHT', Number(e.target.value))}
                              readOnly={!form.client?.isSpecial}
                              className={`w-full text-right border border-amber-200 rounded-lg py-1.5 px-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none ${!form.client?.isSpecial ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                            />
                            {!form.client?.isSpecial && <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.tva}
                            onChange={e => updateLine(line.id, 'tva', Number(e.target.value))}
                            className="w-full text-center bg-white border border-amber-200 rounded-lg py-1.5 px-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-700">{formatAmount(line.totalTTC)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-all">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-4 border-t border-amber-100">
                <div className="min-w-64 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{formatAmount(form.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{formatAmount(form.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-amber-700 border-t border-amber-200 pt-2">
                    <span>Sous-total TTC:</span>
                    <span>{formatAmount(form.totalTTC)}</span>
                  </div>
                  {form.remiseActive && form.remiseMontant > 0 && (
                    <div className="flex justify-between text-sm text-orange-700 bg-orange-50 p-2 rounded">
                      <span>Remise ({form.remisePct}%):</span>
                      <span>- {formatAmount(form.remiseMontant)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-emerald-700">
                    <span>TOTAL TTC:</span>
                    <span>{formatAmount(form.totalTTC - (form.remiseMontant || 0) + (form.timbreAmount || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/50 rounded-2xl border-2 border-dashed border-amber-200 p-8 text-center mb-6">
              <Package className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-amber-700 font-semibold">Aucun produit. Commencez par ajouter des articles.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarques</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-gradient-to-br from-white to-amber-50/30 border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
              placeholder="Ajouter des remarques spécifiques..."
            />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-amber-100 bg-gradient-to-r from-amber-50/50 to-orange-50/30 flex justify-between">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 hover:shadow-xl transition-all"
          >
            <Check size={16} />
            Enregistrer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ facture, onClose, onEdit, onDelete, onPrint }: {
  facture: FactureProformat;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
}) {
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
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto"
      >
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{facture.numero}</h2>
            <p className="text-orange-200 text-sm font-semibold mt-0.5">{facture.date}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Client</p>
              <div className={`p-4 rounded-xl ${facture.client?.isSpecial ? 'bg-amber-50 border border-amber-200' : 'bg-indigo-50 border border-indigo-200'}`}>
                <div className="flex items-center gap-2">
                  {facture.client?.isSpecial && <span className="text-lg">⭐</span>}
                  <p className="text-lg font-bold text-gray-900">{facture.client?.name || 'N/A'}</p>
                  {facture.client?.isSpecial && <span className="badge badge-sm bg-amber-200 text-amber-900">Spécial</span>}
                </div>
                {facture.client?.isSpecial && facture.client?.specialNote && (
                  <p className="text-xs text-amber-800 mt-2 italic">📝 {facture.client.specialNote}</p>
                )}
              </div>
            </div>
          </div>

          {facture.lines.length > 0 && (
            <div className="bg-amber-50/30 rounded-2xl border border-amber-100 overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-50/80 border-b border-amber-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Désignation</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Qté</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">N° Colis</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Colisage</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">P.U HT</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">TVA</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/50">
                    {facture.lines.map(line => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{line.product.designation}</p>
                          <p className="text-xs text-gray-400">{line.product.refProduct}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-600">{line.quantity}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{line.nbreColis || '-'}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{line.colisage || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatAmount(line.prixUnitHT)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">{line.tva}%</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-700">{formatAmount(line.totalTTC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-4 border-t border-amber-100">
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 min-w-64 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{formatAmount(facture.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{formatAmount(facture.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-amber-700 border-t border-amber-200 pt-2">
                    <span>TOTAL TTC:</span>
                    <span>{formatAmount(facture.totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {facture.notes && (
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-4 mb-6">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Remarques</p>
              <p className="text-sm text-gray-700">{facture.notes}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-amber-100 bg-amber-50/30 flex justify-between">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Fermer
          </button>
          <div className="flex gap-3">
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 hover:shadow-xl transition-all"
            >
              <Printer size={16} />
              Imprimer
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/40 hover:shadow-xl transition-all"
            >
              <Edit size={16} />
              Modifier
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 text-white font-bold text-sm shadow-lg hover:shadow-red-500/40 hover:shadow-xl transition-all"
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Print Function ───────────────────────────────────────────────────────────

function printFacture(facture: FactureProformat, settings?: any) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) return;

  const lines = facture.lines.map((l, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><strong>${l.product.designation}</strong><br><small>${l.product.refProduct}</small></td>
      <td class="center">${l.quantity} ${l.product.uniteMesure}</td>
      ${l.nbreColis ? `<td class="center">${l.nbreColis}</td>` : '<td class="center">-</td>'}
      ${l.colisage ? `<td class="center">${l.colisage}</td>` : '<td class="center">-</td>'}
      <td class="right">${new Intl.NumberFormat('fr-DZ').format(l.prixUnitHT)}</td>
      <td class="center">${l.tva}%</td>
      <td class="right"><strong>${new Intl.NumberFormat('fr-DZ').format(l.totalHT)}</strong></td>
      <td class="right"><strong>${new Intl.NumberFormat('fr-DZ').format(l.totalTTC)}</strong></td>
    </tr>
  `).join('');

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture Proformat - ${facture.numero}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Inter', sans-serif; font-size: 12px; padding: 20px; color: #1a1a1a; line-height: 1.5; }
        .receipt-container { max-width: 900px; margin: 0 auto; background: #fff; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; gap: 15px; }
        .company-logo { width: 60px; height: 60px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2); flex-shrink: 0; overflow: hidden; }
        .company-logo img { width: 100%; height: 100%; object-fit: contain; }
        .company-info { flex: 1; }
        .company-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
        .company-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #666; }
        .company-details div { display: flex; flex-direction: column; gap: 1px; }
        .company-details label { font-weight: 600; text-transform: uppercase; font-size: 8px; color: #999; letter-spacing: 0.3px; }
        .company-details span { font-weight: 500; color: #333; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        thead tr { background: linear-gradient(135deg, #f97316, #ea580c); color: white; }
        th { padding: 10px; text-align: left; font-weight: 800; text-transform: uppercase; }
        td { padding: 9px; border-bottom: 1px solid #f0f0f0; }
        .right { text-align: right; }
        .center { text-align: center; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
        .totals-box { background: #fef3c7; padding: 16px 24px; min-width: 280px; border-radius: 8px; border-left: 4px solid #f97316; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="company-logo">
            ${settings?.logo ? `<img src="${settings.logo}">` : 'FP'}
          </div>
          <div class="company-info">
            <div class="company-name">${settings?.name || 'ABRI PLASTIQUE'}</div>
            <div class="company-details">
              <div><label>Adresse</label><span>${settings?.address || 'Alger, Algérie'}</span></div>
              <div><label>Contact</label><span>${settings?.phone || '0799047248'}</span></div>
              ${settings?.email ? `<div><label>Email</label><span>${settings.email}</span></div>` : ''}
              ${settings?.nif ? `<div><label>NIF</label><span>${settings.nif}</span></div>` : ''}
              ${settings?.rc ? `<div><label>RC</label><span>${settings.rc}</span></div>` : ''}
              ${settings?.nis ? `<div><label>NIS</label><span>${settings.nis}</span></div>` : ''}
              ${settings?.article ? `<div><label>Article</label><span>${settings.article}</span></div>` : ''}
              ${settings?.rip ? `<div><label>RIP</label><span>${settings.rip}</span></div>` : ''}
              ${settings?.activite ? `<div><label>Activité</label><span>${settings.activite}</span></div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 900; color: #1a1a1a;">FACTURE PROFORMAT</div>
            <div style="color: #f97316; font-weight: 700; font-size: 13px;">${facture.numero}</div>
            <div style="font-size: 11px; color: #666; font-weight: 600;">${facture.date}</div>
          </div>
        </div>

      ${facture.client ? `
        <div style="margin-bottom: 20px; padding: 12px; background: #fef3c7; border-left: 4px solid #f97316; border-radius: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong>Client:</strong> ${facture.client.name}
              ${facture.client.isSpecial ? '<span style="background: #fff; color: #b45309; padding: 1px 6px; border-radius: 4px; font-size: 9px; border: 1px solid #f97316; margin-left: 8px; font-weight: 900;">⭐ CLIENT SPÉCIAL</span>' : ''}
              ${facture.client.phone ? `<br><strong>Téléphone:</strong> ${facture.client.phone}` : ''}
              ${facture.client.wilaya ? `<br><strong>Wilaya:</strong> ${facture.client.wilaya}` : ''}
              ${facture.client.taxId ? `<br><strong>NIF:</strong> ${facture.client.taxId}` : ''}
            </div>
            ${facture.client.isSpecial && facture.client.specialNote ? `
              <div style="font-size: 10px; color: #b45309; font-style: italic; max-width: 250px; text-align: right;">
                📝 ${facture.client.specialNote}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>Désignation</th>
            <th class="center">Qté</th>
            <th class="center">Nbre Colis</th>
            <th class="center">Colisage</th>
            <th class="right">P.U HT</th>
            <th class="center">TVA</th>
            <th class="right">Total HT</th>
            <th class="right">Total TTC</th>
          </tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Total HT:</span>
            <span>${new Intl.NumberFormat('fr-DZ').format(facture.totalHT)} DA</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Total TVA:</span>
            <span>${new Intl.NumberFormat('fr-DZ').format(facture.totalTVA)} DA</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 700; color: #f97316; border-top: 2px solid #f97316; padding-top: 8px;">
            <span>Sous-total TTC:</span>
            <span>${new Intl.NumberFormat('fr-DZ').format(facture.totalTTC)} DA</span>
          </div>
          ${facture.remiseActive && facture.remiseMontant > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #ea580c;">
              <span>Remise (${facture.remisePct}%):</span>
              <span>- ${new Intl.NumberFormat('fr-DZ').format(facture.remiseMontant)} DA</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: 900; color: #1a1a1a; border-top: 2px solid #f97316; padding-top: 8px;">
            <span>TOTAL TTC:</span>
            <span>${new Intl.NumberFormat('fr-DZ').format((facture.totalTTC - (facture.remiseMontant || 0) + (facture.timbreAmount || 0)))} DA</span>
          </div>
        </div>
      </div>

      ${facture.notes ? `
        <div style="margin-top: 30px; padding: 12px; background: #e0e7ff; border-left: 4px solid #4f46e5; border-radius: 4px;">
          <strong>Remarques:</strong><br>${facture.notes}
        </div>
      ` : ''}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
        <p style="font-size: 11px; color: #666; text-align: center;">
          Facture Proformat générée le ${new Date().toLocaleDateString('fr-DZ')}<br>
          Validité: À confirmer
        </p>
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  win.document.write(htmlTemplate);
  win.document.close();
  win.onafterprint = () => {
    document.body.removeChild(iframe);
    window.location.reload();
  };
  win.focus();
  win.print();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FactureProformatPage() {
  const { settings } = useApp();
  const [factures, setFactures] = useState<FactureProformat[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFacture, setEditingFacture] = useState<FactureProformat | undefined>();
  const [viewingFacture, setViewingFacture] = useState<FactureProformat | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [facturesRes, clientsRes, productsRes] = await Promise.all([
      supabase.from('factures_proformat')
        .select('*, facture_proformat_lines(*)')
        .order('date', { ascending: false }),
      supabase.from('clients')
        .select('id, name, phone, email, tax_id, wilaya, commune, activite, code_postal, address, notes, is_special, special_note')
        .order('name'),
      supabase.from('products')
        .select('id, designation, ref_product, bar_code, prix_achat_ht, prix_vente, tva, current_quantity, unite_mesure, famille')
        .eq('is_active', true)
        .order('designation'),
    ]);

    const clientsList = (clientsRes.data || []).map((r: any) => ({
      id: r.id, 
      name: r.name, 
      phone: r.phone || '',
      email: r.email || '',
      taxId: r.tax_id || '', 
      wilaya: r.wilaya || '', 
      commune: r.commune || '',
      activite: r.activite || '',
      codePostal: r.code_postal || '',
      address: r.address || '',
      notes: r.notes || '',
      isSpecial: r.is_special || false,
      specialNote: r.special_note || ''
    }));
    const productsList = (productsRes.data || []).map((r: any) => ({
      id: r.id, designation: r.designation, refProduct: r.ref_product || '',
      barCode: r.bar_code || '', prixAchatHT: r.prix_achat_ht,
      prixVente: r.prix_vente, tva: r.tva,
      currentQuantity: r.current_quantity, uniteMesure: r.unite_mesure || '',
      famille: r.famille || '',
    }));
    setClients(clientsList);
    setProducts(productsList);

    if (facturesRes.data) {
      setFactures(facturesRes.data.map((row: any): FactureProformat => ({
        id: row.id,
        numero: row.numero,
        date: row.date,
        datelivraison: row.date_livraison || '',
        client: clientsList.find(c => c.id === row.client_id) || null,
        lines: (row.facture_proformat_lines || []).map((l: any) => ({
          id: l.id,
          product: productsList.find(p => p.id === l.product_id) || {
            id: l.product_id || '', designation: l.designation,
            refProduct: '', barCode: '', prixAchatHT: l.prix_unit_ht,
            prixVente: l.prix_unit_ht, tva: l.tva,
            currentQuantity: 0, uniteMesure: '', famille: '',
          },
          quantity: l.quantity,
          prixUnitHT: l.prix_unit_ht,
          tva: l.tva,
          totalHT: l.total_ht,
          totalTTC: l.total_ttc,
          nbreColis: l.nbre_colis || 0,
          colisage: l.colisage || 0,
        })),
        totalHT: row.total_ht,
        totalTVA: row.total_tva,
        totalTTC: row.total_ttc,
        timbreAmount: row.timbre_amount || 0,
        remiseActive: row.remise_active || false,
        remisePct: row.remise_pct || 0,
        remiseMontant: row.remise_montant || 0,
        status: row.status,
        notes: row.notes || '',
        paymentMode: row.payment_mode || 'virement',
      })));
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  const filtered = factures.filter(f => {
    const matchSearch = f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (facture: FactureProformat) => {
    try {
      const payload = {
        numero: facture.numero,
        date: facture.date,
        date_livraison: facture.datelivraison || null,
        client_id: facture.client?.id || null,
        total_ht: facture.totalHT,
        total_tva: facture.totalTVA,
        total_ttc: facture.totalTTC,
        timbre_amount: facture.timbreAmount || 0,
        status: facture.status,
        payment_mode: facture.paymentMode,
        notes: facture.notes || null,
        remise_active: facture.remiseActive,
        remise_pct: facture.remisePct,
        remise_montant: facture.remiseMontant,
      };

      let id = facture.id;
      const existingFacture = editingFacture ? factures.find(f => f.id === editingFacture.id) : null;
      const statusChanged = existingFacture && existingFacture.status !== facture.status;
      const isConfirming = statusChanged && (facture.status === 'confirme' || facture.status === 'envoye');

      if (editingFacture) {
        await supabase.from('factures_proformat').update(payload).eq('id', id);
        await supabase.from('facture_proformat_lines').delete().eq('fp_id', id);
      } else {
        const { data: newFp, error } = await supabase
          .from('factures_proformat').insert(payload).select().single();
        if (error || !newFp) throw error;
        id = newFp.id;
      }

      const lines = facture.lines.map(l => ({
        fp_id: id,
        product_id: l.product.id || null,
        designation: l.product.designation,
        quantity: l.quantity,
        prix_unit_ht: l.prixUnitHT,
        tva: l.tva,
        nbre_colis: l.nbreColis || 0,
        colisage: l.colisage || 0,
      }));
      if (lines.length > 0) await supabase.from('facture_proformat_lines').insert(lines);

      // Handle stock movements when confirming (deduct stock for factures proformat)
      if (isConfirming) {
        for (const line of facture.lines) {
          if (!line.product?.id) continue;

          const { data: product } = await supabase
            .from('products')
            .select('current_quantity')
            .eq('id', line.product.id)
            .single();

          if (product) {
            const newQty = product.current_quantity - line.quantity;
            await supabase
              .from('products')
              .update({ current_quantity: newQty })
              .eq('id', line.product.id);

            // Record stock movement
            await supabase.from('stock_movements').insert({
              product_id: line.product.id,
              quantity_before: product.current_quantity,
              quantity_change: -line.quantity,
              quantity_after: newQty,
              reason: `Facture Proformat ${facture.numero}`,
              reference_type: 'factures_proformat',
              reference_id: id,
            });
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Error saving facture proformat:', err);
      alert('Erreur lors de la sauvegarde');
    }
    setShowForm(false);
    setEditingFacture(undefined);
  };

  const handleConvertToBL = async (fp: FactureProformat) => {
    if (!confirm('Convertir cette facture proformat en Bon de Livraison ?')) return;
    
    try {
      // Generate BL number
      const blNum = `BL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      
      // Insert bon_livraison
      const { data: bl, error } = await supabase
        .from('bons_livraison')
        .insert({
          numero: blNum,
          date: new Date().toISOString().split('T')[0],
          client_id: fp.client?.id || null,
          total_ht: fp.totalHT,
          total_tva: fp.totalTVA,
          total_ttc: fp.totalTTC,
          status: 'brouillon',
          notes: `Converti depuis FP: ${fp.numero}`,
          proformat_id: fp.id,
        })
        .select().single();
        
      if (error || !bl) { alert('Erreur lors de la conversion'); return; }
      
      // Insert lines
      const lines = fp.lines.map(l => ({
        bl_id: bl.id,
        product_id: l.product?.id || null,
        designation: l.product?.designation || 'Article',
        quantity: l.quantity,
        prix_unit_ht: l.prixUnitHT,
        tva: l.tva,
        total_ht: l.totalHT,
        total_ttc: l.totalTTC,
      }));
      await supabase.from('bon_livraison_lines').insert(lines);
      
      // Mark proformat as converted
      await supabase.from('factures_proformat').update({ status: 'envoye' }).eq('id', fp.id);
      
      alert(`Bon de Livraison ${blNum} créé avec succès !`);
      await loadData();
    } catch (err) {
      console.error('Error converting to BL:', err);
      alert('Erreur lors de la conversion');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cette facture proformat ?')) {
      try {
        await supabase.from('facture_proformat_lines').delete().eq('fp_id', id);
        await supabase.from('factures_proformat').delete().eq('id', id);
        await loadData();
      } catch (err) {
        console.error('Error deleting facture proformat:', err);
      }
    }
  };

  const totalTTC = factures.reduce((s, f) => s + f.totalTTC, 0);
  const confirmed = factures.filter(f => f.status === 'confirme').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 bg-clip-text text-transparent">
            Factures Proformat
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gestion des factures proformat et devis commerciaux</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingFacture(undefined); setShowForm(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-orange-500/40 transition-all w-full md:w-auto"
        >
          <Plus size={20} />
          Nouvelle Facture
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl hover:shadow-orange-500/40 transition-all"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <span className="text-xs font-bold uppercase tracking-widest">Montant Total TTC</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight">{formatAmount(totalTTC)}</h2>
            <div className="mt-4 flex gap-4">
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Total Factures</p>
                <p className="text-lg font-black">{factures.length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Confirmées</p>
                <p className="text-lg font-black">{confirmed}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-white to-amber-50/20 rounded-3xl border border-amber-100/50 shadow-xl overflow-hidden"
      >
        {/* Table Header */}
        <div className="p-6 md:p-8 border-b border-amber-100/50 bg-gradient-to-r from-amber-50/50 to-orange-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-900">Liste des Factures Proformat</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par N° ou client..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-16 h-16 text-amber-200 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold mb-2">
              {factures.length === 0 ? 'Aucune facture proformat créée' : 'Aucun résultat trouvé'}
            </p>
            {factures.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="text-amber-600 hover:text-amber-700 font-bold text-sm"
              >
                Créer la première facture
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-amber-50/80 to-orange-50/50 border-b border-amber-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">N° Facture</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Articles</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Montant TTC</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/50">
                {filtered.map(facture => (
                  <motion.tr
                    key={facture.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-amber-50/50 transition-all"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{facture.numero}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{facture.client?.name || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                        {facture.lines.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-700">
                      {formatAmount(facture.totalTTC)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {new Date(facture.date).toLocaleDateString('fr-DZ')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewingFacture(facture)}
                          className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setEditingFacture(facture); setShowForm(true); }}
                          className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => printFacture(facture, settings)}
                          className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all"
                          title="Imprimer"
                        >
                          <Printer size={16} />
                        </motion.button>
                        {facture.status === 'confirme' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleConvertToBL(facture)}
                            className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all"
                            title="Convertir en Bon de Livraison"
                          >
                            <Truck size={16} />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(facture.id)}
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
          <FactureForm
            facture={editingFacture}
            products={products}
            clients={clients}
            onClose={() => { setShowForm(false); setEditingFacture(undefined); }}
            onSave={handleSave}
          />
        )}
        {viewingFacture && (
          <ViewModal
            facture={viewingFacture}
            onClose={() => setViewingFacture(undefined)}
            onEdit={() => { setEditingFacture(viewingFacture); setViewingFacture(undefined); setShowForm(true); }}
            onDelete={() => handleDelete(viewingFacture.id)}
            onPrint={() => printFacture(viewingFacture, settings)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
