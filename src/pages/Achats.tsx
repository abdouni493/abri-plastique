/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Achats — Professional Purchase Order Management Interface
 * Redesigned with same architecture as Inventaire
 * Color Scheme: Emerald/Green
 */

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Printer, Eye, X,
  Package, TrendingDown, Calendar, User, Check,
  Filter, ChevronDown, Upload, Download, Info, CreditCard, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { uploadJustificatif, downloadImage } from '../lib/storage';
import { useApp } from '../context/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  phone: string;
  taxId?: string;
  wilaya?: string;
}

interface PurchaseLine {
  id: string;
  productId?: string | null;
  designation: string;
  quantity: number;
  prixUnitHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
  prixVente?: number;
  limitePrixVente?: number;
  quantityMinimal?: number;
}

interface Achat {
  id: string;
  numero: string;
  date: string;
  supplierId: string | null;
  lines: PurchaseLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  montantPaye: number;
  status: 'brouillon' | 'commande' | 'livree' | 'payé' | 'dette';
  notes: string;
  paymentMode: 'especes' | 'virement' | 'cheque' | 'traite';
  proof?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mapAchat = (row: any): Achat => ({
  id: row.id,
  numero: row.numero,
  date: row.date,
  supplierId: row.supplier_id,
  lines: (row.achat_lines || []).map((l: any) => ({
    id: l.id,
    productId: l.product_id || null,
    designation: l.designation,
    quantity: l.quantity,
    prixUnitHT: l.prix_unit_ht,
    tva: l.tva,
    totalHT: l.total_ht,
    totalTTC: l.total_ttc,
    prixVente: l.prix_vente || 0,
    limitePrixVente: l.limite_prix_vente,
    quantityMinimal: l.quantity_minimal || 0,
  })),
  totalHT: row.total_ht,
  totalTVA: row.total_tva,
  totalTTC: row.total_ttc,
  montantPaye: row.montant_paye || 0,
  status: row.status,
  notes: row.notes || '',
  paymentMode: row.payment_mode || 'especes',
  proof: row.proof || undefined,
});

const mapSupplier = (row: any): Supplier => ({
  id: row.id,
  name: row.name,
  phone: row.phone || '',
  taxId: row.nif,
  wilaya: row.wilaya,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA';

const fmtNum = (n: number) =>
  new Intl.NumberFormat('fr-DZ').format(n);

const genId = () => Math.random().toString(36).substr(2, 9);

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700', bg: 'bg-amber-100' },
  commande: { label: 'Commandée', color: 'text-blue-700', bg: 'bg-blue-100' },
  livree: { label: 'Livrée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  payé: { label: 'Payée', color: 'text-green-700', bg: 'bg-green-100' },
  dette: { label: 'En Dette', color: 'text-red-700', bg: 'bg-red-100' },
};

const PAYMENT_STATUS_MAP = {
  all: { label: 'Tous', color: 'text-gray-600', bg: 'bg-gray-100' },
  payé: { label: 'Payée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  dette: { label: 'En Dette', color: 'text-red-700', bg: 'bg-red-100' },
};

// Helper to get payment status from achat
const getPaymentStatus = (a: Achat): 'payé' | 'dette' | 'brouillon' => {
  if (a.montantPaye >= a.totalTTC && a.totalTTC > 0) return 'payé';
  if (a.montantPaye > 0 || (a.status as string) === 'dette') return 'dette';
  if ((a.status as string) === 'payé') return 'payé';
  return 'brouillon';
};

// ─── Product Search ───────────────────────────────────────────────────────────

function ProductSearch({ products, onSelect, placeholder = 'Rechercher un produit...' }: {
  products: any[];
  onSelect: (p: any) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const results = products.filter(p =>
    p.designation.toLowerCase().includes(query.toLowerCase())
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden"
          >
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.designation}</p>
                  <p className="text-xs text-gray-400 font-semibold">TVA {p.tva}%</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-600">{fmt(p.prix_achat_ht)}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Entity Search ───────────────────────────────────────────────────────────

function EntitySearch({ entities, onSelect, placeholder, icon: Icon }: {
  entities: Supplier[];
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
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden"
          >
            {results.map(s => (
              <button
                key={s.id}
                onClick={() => { onSelect(s); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.wilaya}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Print Function ───────────────────────────────────────────────────────────

function printAchat(achat: Achat, supplier: Supplier | undefined, settings?: any) {
  const win = window.open('', '_self');
  if (!win) return;

  const lines = achat.lines.map((l, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><strong>${l.designation}</strong></td>
      <td class="center">${fmtNum(l.quantity)}</td>
      <td class="right">${fmt(l.prixUnitHT)}</td>
      <td class="center">${l.tva}%</td>
      <td class="right"><strong>${fmt(l.totalHT)}</strong></td>
      <td class="right"><strong>${fmt(l.totalTTC)}</strong></td>
    </tr>
  `).join('');

  const currentDate = new Date().toLocaleDateString('fr-DZ');
  const reste = Math.max(0, achat.totalTTC - achat.montantPaye);

  const htmlTemplate = `
    <!DOCTYPE html>
    <html dir="ltr" lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Bon de Commande - ${achat.numero}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;900&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page { size: A4; margin: 10mm; }
        
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
        
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; background: #fff; color: #1a1a1a; line-height: 1.5; }
        
        .receipt-container { max-width: 900px; margin: 0 auto; background: #fff; padding: 18px; }
        
        .company-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 15px; gap: 15px; }
        .company-logo { width: 60px; height: 60px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2); flex-shrink: 0; overflow: hidden; }
        .company-logo img { width: 100%; height: 100%; object-fit: contain; }
        .company-info { flex: 1; }
        .company-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
        .company-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #666; }
        .company-details div { display: flex; flex-direction: column; gap: 1px; }
        .company-details label { font-weight: 600; text-transform: uppercase; font-size: 8px; color: #999; letter-spacing: 0.3px; }
        .company-details span { font-weight: 500; color: #333; font-size: 10px; }
        
        .document-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; border-left: 3px solid #059669; }
        .document-title h1 { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 900; color: #1a1a1a; }
        .document-title p { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .doc-ref { text-align: right; }
        .doc-ref .label { font-size: 8px; font-weight: 700; color: #999; }
        .doc-ref .value { font-size: 11px; font-weight: 700; color: #059669; }
        
        .parties-section { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
        .party-box { padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; border-left: 3px solid #059669; }
        .party-box label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #666; }
        .party-box .value { font-size: 11px; font-weight: 600; color: #1a1a1a; margin-top: 3px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
        thead tr { background: linear-gradient(135deg, #059669, #10b981); color: white; }
        th { padding: 8px; text-align: left; font-weight: 700; }
        td { padding: 7px; border-bottom: 1px solid #f0f0f0; }
        .right { text-align: right; }
        .center { text-align: center; }
        
        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 15px; }
        .totals-box { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff; padding: 12px 16px; min-width: 250px; border-radius: 8px; }
        .totals-box .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
        .totals-box .total-row { border-top: 1.5px solid rgba(255,255,255,0.3); padding-top: 8px; margin-top: 8px; font-weight: 900; font-size: 13px; }
        
        .payment-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
        .payment-box { padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; }
        .payment-box label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #666; }
        .payment-box .value { font-size: 12px; font-weight: 700; color: #1a1a1a; margin-top: 3px; }
        
        .notes-section { padding: 10px; background: #d1fae5; border-left: 3px solid #059669; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
        .notes-section label { font-weight: 700; }
        
        .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 15px; padding-top: 12px; border-top: 1.5px solid #e5e7eb; }
        .signature-box { text-align: center; }
        .signature-space { min-height: 40px; border-bottom: 1.5px solid #1a1a1a; margin-bottom: 3px; }
        .signature-label { font-size: 8px; font-weight: 600; color: #666; text-transform: uppercase; }
        
        .footer-section { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 8px; color: #999; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="company-header">
          <div class="company-logo">
            ${settings?.logo ? `<img src="${settings.logo}">` : 'AC'}
          </div>
          <div class="company-info">
            <div class="company-name">${settings?.name || 'ABRI PLASTIQUE'}</div>
            <div class="company-details">
              <div><label>Adresse</label><span>${settings?.address || 'Alger, Algérie'}</span></div>
              <div><label>Contact</label><span>${settings?.phone || '0799047248'}</span></div>
              ${settings?.nif || 'Numéro d\'Identification Fiscale' ? `<div><label>NIF</label><span>${settings?.nif || 'Numéro d\'Identification Fiscale'}</span></div>` : ''}
              ${settings?.rip || '00000 00000 0000000000 00' ? `<div><label>RIP</label><span>${settings?.rip || '00000 00000 0000000000 00'}</span></div>` : ''}
            </div>
          </div>
        </div>
        
        <div class="document-header">
          <div class="document-title">
            <h1>Bon de Commande</h1>
            <p>Achat - Bon de Commande</p>
          </div>
          <div class="doc-ref">
            <div class="label">Numero:</div>
            <div class="value">${achat.numero}</div>
            <div class="label" style="margin-top: 4px;">Date:</div>
            <div class="value">${achat.date}</div>
          </div>
        </div>
        
        <div class="parties-section">
          <div class="party-box">
            <label>Acheteur</label>
            <div class="value">${settings?.name || 'ABRI PLASTIQUE'}<br>${settings?.address || 'Alger, Algérie'}</div>
          </div>
          ${supplier ? `
          <div class="party-box">
            <label>Fournisseur</label>
            <div class="value">${supplier.name}${supplier.phone ? '<br>' + supplier.phone : ''}${supplier.wilaya ? '<br>' + supplier.wilaya : ''}${supplier.taxId ? '<br>NIF: ' + supplier.taxId : ''}</div>
          </div>
          ` : '<div class="party-box"><label>Fournisseur</label><div class="value">Non spécifié</div></div>'}
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="center" style="width: 5%;">#</th>
              <th style="width: 35%;">Désignation</th>
              <th class="center" style="width: 10%;">Quantité</th>
              <th class="right" style="width: 15%;">P.U HT</th>
              <th class="center" style="width: 8%;">TVA</th>
              <th class="right" style="width: 13%;">Total HT</th>
              <th class="right" style="width: 14%;">Total TTC</th>
            </tr>
          </thead>
          <tbody>${lines}</tbody>
        </table>
        
        <div class="totals-section">
          <div class="totals-box">
            <div class="row"><span>Total HT:</span><span>${fmt(achat.totalHT)}</span></div>
            <div class="row"><span>Total TVA:</span><span>${fmt(achat.totalTVA)}</span></div>
            <div class="row total-row"><span>TOTAL TTC:</span><span>${fmt(achat.totalTTC)}</span></div>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="payment-box">
            <label>Montant Paye</label>
            <div class="value">${fmt(achat.montantPaye)}</div>
          </div>
          <div class="payment-box">
            <label>Solde Restant</label>
            <div class="value" style="color: ${reste > 0 ? '#ef4444' : '#10b981'};">${fmt(reste)}</div>
          </div>
        </div>
        
        ${achat.notes ? `
        <div class="notes-section">
          <label>Notes / Remarques:</label>
          <div style="margin-top: 5px;">${achat.notes}</div>
        </div>
        ` : ''}
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-label">Signature Acheteur</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-label">Fournisseur Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-label">Cachet Entreprise</div>
          </div>
        </div>
        
        <div class="footer-section">
          <p>Bon de commande genere le ${currentDate}</p>
          <p style="margin-top: 2px;">Merci pour votre partenariat | SAF-Cash</p>
        </div>
      </div>
      
      <script>
        let printHandled = false;
        window.addEventListener('load', function() {
          setTimeout(function() { window.print(); }, 100);
        });
        window.addEventListener('afterprint', function() {
          if (!printHandled) { printHandled = true; window.location.href = window.location.href; }
        });
        window.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') { window.location.href = window.location.href; }
        });
      </script>
    </body>
    </html>
  `;

  win.document.write(htmlTemplate);
  win.document.close();
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ achat, suppliers, onClose, settings }: {
  achat: Achat;
  suppliers: Supplier[];
  onClose: () => void;
  settings?: any;
}) {
  const supplier = suppliers.find(s => s.id === achat.supplierId);
  const st = STATUS_MAP[achat.status];

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -40 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">{achat.numero}</h2>
            <p className="text-emerald-200 text-sm font-semibold mt-0.5">{achat.date}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fournisseur</p>
              <p className="text-lg font-bold text-gray-900">{supplier?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Statut</p>
              <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${st.bg} ${st.color}`}>
                {st.label}
              </span>
            </div>
          </div>

          {achat.lines.length > 0 && (
            <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-50/80 border-b border-emerald-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Désignation</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Qté</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">P.U HT</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">TVA</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100/50">
                    {achat.lines.map(line => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{line.designation}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-600">{fmtNum(line.quantity)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(line.prixUnitHT)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">{line.tva}%</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700">{fmt(line.totalTTC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-4 border-t border-emerald-100">
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 min-w-64 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{fmt(achat.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{fmt(achat.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-700 border-t border-emerald-200 pt-2">
                    <span>TOTAL TTC:</span>
                    <span>{fmt(achat.totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {achat.notes && (
            <div className="bg-teal-50 border-l-4 border-teal-400 rounded-xl p-4">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">Remarques</p>
              <p className="text-sm text-gray-700">{achat.notes}</p>
            </div>
          )}

          {achat.proof && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1 mb-3">Justificatif</p>
              <img 
                src={achat.proof} 
                className="w-full rounded-2xl border border-emerald-200 shadow-sm object-cover max-h-96" 
                alt="Justificatif" 
              />
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-emerald-100 bg-emerald-50/30 flex flex-col gap-3 shrink-0">
          {achat.proof && (
            <button 
              onClick={async () => {
                try {
                  await downloadImage(achat.proof!, `justificatif-achat-${achat.numero}.jpg`);
                } catch (err) {
                  console.error('Error downloading image:', err);
                  alert('Erreur lors du téléchargement de l\'image');
                }
              }}
              className="w-full flex items-center justify-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-2xl py-4 font-black transition-all text-xs uppercase tracking-[0.2em]"
            >
              <Download size={18} />
              Télécharger l'image
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
              Fermer
            </button>
            <button
              onClick={() => printAchat(achat, supplier, settings)}
              className="flex-1 flex items-center gap-2 justify-center px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/40 hover:shadow-xl transition-all"
            >
              <Printer size={16} />
              Imprimer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

const AchatForm: React.FC<{
  achat?: Achat;
  suppliers: Supplier[];
  products: any[];
  generateNumero: (prefix: string, docType: string) => Promise<string>;
  onClose: () => void;
  onSave: (a: Achat) => void;
}> = function({ achat, suppliers, products, generateNumero, onClose, onSave }) {
  const isNew = !achat;
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null>(achat?.proof || null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [montantPaye, setMontantPaye] = useState<number>(achat?.montantPaye || 0);

  const [form, setForm] = useState<Achat>(achat || {
    id: genId(),
    numero: 'ACH-TMP',
    date: new Date().toISOString().split('T')[0],
    supplierId: null,
    lines: [],
    totalHT: 0,
    totalTVA: 0,
    totalTTC: 0,
    montantPaye: 0,
    status: 'brouillon' as const,
    notes: '',
    paymentMode: 'especes' as const,
  });

  const resteAPayer = Math.max(0, form.totalTTC - montantPaye);

  const [attachment, setAttachment] = useState<File | null>(null);

  // Generate numero for new achats
  useEffect(() => {
    if (isNew && form.numero === 'ACH-TMP') {
      generateNumero('ACH', 'achat').then(numero => {
        setForm(f => ({ ...f, numero }));
      });
    }
  }, [isNew]);

  const recalc = (lines: PurchaseLine[]) => {
    const totalHT = lines.reduce((s, l) => s + l.totalHT, 0);
    const totalTVA = lines.reduce((s, l) => s + (l.totalHT * l.tva / 100), 0);
    return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
  };

  const addProduct = (p: any) => {
    const line: PurchaseLine = {
      id: genId(),
      productId: p.id,
      designation: p.designation,
      quantity: 1,
      prixUnitHT: p.prix_achat_ht,
      tva: p.tva,
      totalHT: p.prix_achat_ht,
      totalTTC: p.prix_achat_ht * (1 + p.tva / 100),
      prixVente: p.prix_vente || 0,
      limitePrixVente: p.limite_prix_vente,
      quantityMinimal: p.quantity_minimal || 0,
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

  const handleSave = async () => {
    setUploadingFile(true);
    setUploadError(null);
    try {
      let proofUrl: string | undefined = currentProofUrl || undefined;
      if (attachment) {
        proofUrl = await uploadJustificatif(attachment, 'achats');
        if (!proofUrl) {
          setUploadError('Erreur lors du téléchargement du justificatif.');
          setUploadingFile(false);
          return;
        }
      }
      // Determine status based on payment
      let status: 'brouillon' | 'commande' | 'livree' | 'payé' | 'dette' = form.status;
      if (montantPaye > 0) {
        if (montantPaye >= form.totalTTC) {
          status = 'payé';
        } else {
          status = 'dette';
        }
      }
      const updatedForm = { ...form, proof: proofUrl, montantPaye, status };
      onSave(updatedForm);
      onClose();
    } catch (err) {
      console.error('Error saving achat:', err);
      setUploadError('Erreur lors de la création de l\'achat.');
      setUploadingFile(false);
    }
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
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{isNew ? 'Nouveau' : 'Modifier'} Achat</h2>
            <p className="text-emerald-200 text-sm font-semibold mt-0.5">{form.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Commande</label>
              <input
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode Paiement</label>
              <select
                value={form.paymentMode}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value as any }))}
                className="w-full bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option value="especes">Espèces</option>
                <option value="virement">Virement Bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="traite">Traite</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fournisseur</label>
            <EntitySearch
              entities={suppliers}
              onSelect={(s) => setForm(f => ({ ...f, supplierId: s.id }))}
              placeholder="Rechercher un fournisseur..."
              icon={User}
            />
            {form.supplierId && (
              <div className="mt-2 px-3 py-2 bg-emerald-50 rounded-xl flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700">{suppliers.find(s => s.id === form.supplierId)?.name}</span>
                <button onClick={() => setForm(f => ({ ...f, supplierId: null }))} className="text-emerald-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ajouter des Produits</label>
            <ProductSearch products={products} onSelect={addProduct} placeholder="Rechercher un produit..." />
          </div>

          {form.lines.length > 0 ? (
            <div className="bg-gradient-to-br from-emerald-50/30 to-teal-50/20 rounded-2xl border border-emerald-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-b border-emerald-100">
                      <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Désignation</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Qté</th>
                      <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">P.U HT</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">TVA %</th>
                      <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">P.V HT</th>
                      <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Limite P.V</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Qté Min</th>
                      <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Total TTC</th>
                      <th className="px-3 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100/50">
                    {form.lines.map(line => (
                      <tr key={line.id} className="hover:bg-white/60 transition-all">
                        <td className="px-3 py-3">
                          <p className="font-bold text-gray-900 text-sm">{line.designation}</p>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                            className="w-full text-center bg-white border border-emerald-200 rounded-lg py-1 px-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.prixUnitHT}
                            onChange={e => updateLine(line.id, 'prixUnitHT', Number(e.target.value))}
                            className="w-full text-right bg-white border border-emerald-200 rounded-lg py-1 px-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.tva}
                            onChange={e => updateLine(line.id, 'tva', Number(e.target.value))}
                            className="w-full text-center bg-white border border-emerald-200 rounded-lg py-1 px-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.prixVente || 0}
                            onChange={e => updateLine(line.id, 'prixVente', Number(e.target.value))}
                            className="w-full text-right bg-white border border-blue-200 rounded-lg py-1 px-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.limitePrixVente || 0}
                            onChange={e => updateLine(line.id, 'limitePrixVente', Number(e.target.value))}
                            className="w-full text-right bg-white border border-orange-200 rounded-lg py-1 px-2 text-sm font-bold focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            value={line.quantityMinimal || 0}
                            onChange={e => updateLine(line.id, 'quantityMinimal', Number(e.target.value))}
                            className="w-full text-center bg-white border border-purple-200 rounded-lg py-1 px-2 text-sm font-bold focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none"
                          />
                        </td>
                        <td className="px-3 py-3 text-right font-black text-emerald-700 text-sm">{fmt(line.totalTTC)}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-all">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-4 border-t border-emerald-100">
                <div className="min-w-72 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{fmt(form.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{fmt(form.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-700 border-t border-emerald-200 pt-2">
                    <span>TOTAL TTC:</span>
                    <span>{fmt(form.totalTTC)}</span>
                  </div>
                  {/* Payment section */}
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-emerald-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Montant Payé</label>
                      <div className="relative w-40">
                        <input
                          type="number"
                          min="0"
                          max={form.totalTTC}
                          value={montantPaye}
                          onChange={e => setMontantPaye(Math.min(form.totalTTC, Math.max(0, Number(e.target.value))))}
                          className="w-full text-right bg-white border-2 border-emerald-400 rounded-xl py-2 px-3 text-sm font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl font-black text-sm ${
                      resteAPayer > 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    }`}>
                      <span>{resteAPayer > 0 ? '⚠️ Reste à payer (Dette):' : '✅ Soldé'}</span>
                      <span>{fmt(resteAPayer)}</span>
                    </div>
                    {resteAPayer > 0 && (
                      <p className="text-xs text-red-600 font-semibold text-center">
                        Le solde restant sera enregistré comme dette fournisseur
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200 p-8 text-center mb-6">
              <Package className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-700 font-semibold">Aucun produit. Commencez par ajouter des articles.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarques</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
              placeholder="Ajouter des remarques spécifiques..."
            />
          </div>

          <div className="space-y-2 flex flex-col font-sans normal-case">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Justificatif</label>
             
             {currentProofUrl && (
               <div className="space-y-3">
                 <div className="relative rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50">
                   <img src={currentProofUrl} alt="Current proof" className="w-full h-48 object-cover" />
                   <button
                     type="button"
                     onClick={() => {
                       setCurrentProofUrl(null);
                       setUploadedFileName(null);
                     }}
                     className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                   >
                     <X size={18} />
                   </button>
                 </div>
                 <p className="text-xs text-emerald-600 font-bold">Image actuelle - Cliquez sur X pour la supprimer</p>
               </div>
             )}
             
             <label className="border-2 border-dashed rounded-3xl p-8 flex flex-col items-center gap-2 hover:border-emerald-400 cursor-pointer transition-colors group border-gray-200">
                <Upload className="text-gray-400 group-hover:text-emerald-600 transition-colors" size={32} />
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {uploadedFileName ? 'Changer le justificatif' : (currentProofUrl ? 'Remplacer le justificatif' : 'Uploader justificatif')}
                </p>
                {uploadedFileName && (
                  <p className="text-xs font-bold text-emerald-600 mt-2">✓ {uploadedFileName}</p>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAttachment(e.target.files[0]);
                      setUploadedFileName(e.target.files[0].name);
                      setUploadError(null);
                    }
                  }} 
                />
             </label>
             {uploadError && (
               <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-bold">
                 {uploadError}
               </div>
             )}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 flex justify-between shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={uploadingFile}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/40 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingFile ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Upload...
              </>
            ) : (
              <>
                <Check size={16} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Pay Debt Modal ───────────────────────────────────────────────────

function AchatPayDebtModal({ achat, supplier, onClose, onPaid }: {
  achat: Achat;
  supplier: Supplier | undefined;
  onClose: () => void;
  onPaid: () => void;
}) {
  const reste = Math.max(0, achat.totalTTC - achat.montantPaye);
  const [payAmount, setPayAmount] = useState<string>(String(reste));
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Math.min(Number(payAmount) || 0, reste);
  const newPaid = achat.montantPaye + amountNum;
  const newReste = Math.max(0, achat.totalTTC - newPaid);

  const handlePrint = () => {
    const win = window.open('', '_self');
    if (!win) return;
    const currentDate = new Date().toLocaleDateString('fr-DZ');
    const html = `
      <!DOCTYPE html>
      <html dir="ltr" lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Recu de Paiement - ${achat.numero}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 10mm; }
          @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; background: #fff; color: #1a1a1a; line-height: 1.5; }
          .receipt-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; }
          .company-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 15px; gap: 15px; }
          .company-logo { width: 50px; height: 50px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2); flex-shrink: 0; }
          .company-info { flex: 1; }
          .company-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
          .company-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px; color: #666; }
          .company-details div { display: flex; flex-direction: column; gap: 1px; }
          .company-details label { font-weight: 600; text-transform: uppercase; font-size: 8px; color: #999; }
          .company-details span { font-weight: 500; color: #333; font-size: 10px; }
          .document-title { text-align: center; margin-bottom: 15px; padding: 12px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; border-left: 3px solid #059669; }
          .document-title h1 { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 900; color: #1a1a1a; margin-bottom: 3px; }
          .document-title p { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
          .info-box { padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; border-left: 3px solid #059669; }
          .info-box label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #666; }
          .info-box .value { font-size: 11px; font-weight: 600; color: #1a1a1a; margin-top: 3px; }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          .details-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          .details-table .label { font-weight: 700; color: #666; width: 40%; }
          .details-table .value { font-weight: 600; color: #1a1a1a; text-align: right; }
          .amount-box { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 15px; }
          .amount-box .label { color: rgba(255,255,255,0.9); font-size: 10px; }
          .amount-box .value { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; margin-top: 8px; }
          .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 15px; border-top: 1.5px solid #e5e7eb; }
          .signature-box { text-align: center; }
          .signature-space { min-height: 50px; border-bottom: 1.5px solid #1a1a1a; margin-bottom: 4px; }
          .signature-label { font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; }
          .footer-section { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #999; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="company-header">
            <div class="company-logo">RP</div>
            <div class="company-info">
              <div class="company-name">Mon Entreprise</div>
              <div class="company-details">
                <div><label>Adresse</label><span>Alger, Algérie</span></div>
                <div><label>Contact</label><span>+213 (0) 555 000 000</span></div>
              </div>
            </div>
          </div>
          
          <div class="document-title">
            <h1>Recu de Paiement</h1>
            <p>Paiement Partiel / Total</p>
          </div>
          
          <div class="info-section">
            <div class="info-box">
              <label>Facture Numero</label>
              <div class="value">${achat.numero}</div>
            </div>
            <div class="info-box">
              <label>Date du Paiement</label>
              <div class="value">${currentDate}</div>
            </div>
          </div>
          
          <div class="info-box" style="margin-bottom: 15px;">
            <label>Fournisseur</label>
            <div class="value">${supplier?.name || 'N/A'}${supplier?.phone ? '<br>' + supplier.phone : ''}${supplier?.wilaya ? '<br>' + supplier.wilaya : ''}</div>
          </div>
          
          <table class="details-table">
            <tr>
              <td class="label">Montant Total Facture</td>
              <td class="value">${fmt(achat.totalTTC)}</td>
            </tr>
            <tr>
              <td class="label">Montant Precedemment Paye</td>
              <td class="value">${fmt(achat.montantPaye)}</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td class="label" style="font-size: 12px; color: #ef4444;">Montant de ce Paiement</td>
              <td class="value" style="color: #ef4444; font-size: 13px; font-weight: 900;">${fmt(amountNum)}</td>
            </tr>
          </table>
          
          <div class="amount-box">
            <div class="label">Solde Restant</div>
            <div class="value">${fmt(newReste)}</div>
          </div>
          
          ${payNote ? `
          <div style="padding: 10px; background: #f0fdf4; border-left: 3px solid #059669; border-radius: 6px; margin-bottom: 15px; font-size: 11px;">
            <strong>Notes:</strong>
            <div style="margin-top: 5px;">${payNote}</div>
          </div>
          ` : ''}
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-space"></div>
              <div class="signature-label">Signature Comptable</div>
            </div>
            <div class="signature-box">
              <div class="signature-space"></div>
              <div class="signature-label">Visas Direction</div>
            </div>
          </div>
          
          <div class="footer-section">
            <p>Recu genere le ${currentDate}</p>
            <p style="margin-top: 3px;">Merci pour votre paiement | SAF-Cash</p>
          </div>
        </div>
        
        <script>
          let printHandled = false;
          window.addEventListener('load', function() {
            setTimeout(function() { window.print(); }, 100);
          });
          window.addEventListener('afterprint', function() {
            if (!printHandled) { printHandled = true; window.location.href = window.location.href; }
          });
          window.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { window.location.href = window.location.href; }
          });
        </script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const handleSave = async () => {
    if (amountNum <= 0) { setError('Montant invalide'); return; }
    setSaving(true); setError(null);
    try {
      // Find existing debt for this achat
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('supplier_id', achat.supplierId || '')
        .eq('invoice_number', achat.numero)
        .maybeSingle();

      if (debts) {
        // Add payment record
        await supabase.from('debt_payments').insert({
          debt_id: debts.id,
          amount: amountNum,
          payment_mode: 'especes',
          date: new Date().toISOString().split('T')[0],
          notes: payNote || undefined,
        });
        // Update debt paid_amount
        await supabase.from('debts').update({
          paid_amount: (debts.paid_amount || 0) + amountNum,
        }).eq('id', debts.id);
      } else {
        // Create debt and payment in one go
        const { data: newDebt } = await supabase.from('debts').insert({
          supplier_id: achat.supplierId,
          total_amount: achat.totalTTC,
          paid_amount: achat.montantPaye + amountNum,
          date: achat.date,
          invoice_number: achat.numero,
          description: `Achat ${achat.numero}`,
        }).select().single();
        if (newDebt && payNote) {
          await supabase.from('debt_payments').insert({
            debt_id: newDebt.id,
            amount: amountNum,
            payment_mode: 'especes',
            date: new Date().toISOString().split('T')[0],
            notes: payNote,
          });
        }
      }

      // Update achat montant_paye
      const newStatus = newPaid >= achat.totalTTC ? 'payé' : 'dette';
      await supabase.from('achats').update({
        montant_paye: newPaid,
        status: newStatus,
      }).eq('id', achat.id);

      onPaid();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2"><CreditCard size={20} />Payer la Dette</h2>
            <p className="text-emerald-200 text-xs font-semibold mt-0.5">{achat.numero} · {supplier?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={18} /></button>
        </div>

        <div className="p-7 space-y-4">
          {/* Invoice Summary */}
          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Total Facture</span>
              <span className="font-black text-gray-900">{fmt(achat.totalTTC)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Déjà Payé</span>
              <span className="font-black text-emerald-700">{fmt(achat.montantPaye)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-emerald-200 pt-2">
              <span className="text-gray-700 font-bold">Reste à Payer</span>
              <span className="font-black text-red-700 text-base">{fmt(reste)}</span>
            </div>
          </div>

          {/* Payment input */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Montant à payer maintenant</label>
            <input
              type="number" min="0" max={reste}
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              className="w-full border-2 border-emerald-400 rounded-xl py-3 px-4 text-lg font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/20 outline-none text-right"
            />
          </div>

          {/* Result preview */}
          {amountNum > 0 && (
            <div className={`rounded-xl p-4 border-2 ${
              newReste <= 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}>
              <div className="flex justify-between text-sm font-bold">
                <span>Nouveau solde restant:</span>
                <span className="text-lg">{fmt(newReste)}</span>
              </div>
              {newReste <= 0 && <p className="text-xs font-bold mt-1">✅ Facture soldée intégralement!</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Note (optionnel)</label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Ex: Virement, chèque n°..."
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-4 focus:ring-emerald-500/20 outline-none" />
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
            className="flex-1 py-3 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
            {saving ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AchatsPage() {
  const { settings } = useApp();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAchat, setEditingAchat] = useState<Achat | undefined>();
  const [viewingAchat, setViewingAchat] = useState<Achat | undefined>();
  const [payingAchat, setPayingAchat] = useState<Achat | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Generate unique document numero from document_sequences table
  const generateNumero = async (prefix: string, docType: string): Promise<string> => {
    const year = new Date().getFullYear();
    try {
      const { data } = await supabase
        .from('document_sequences')
        .select('*')
        .eq('doc_type', docType)
        .maybeSingle();

      if (data) {
        const newSeq = data.year === year ? (data.last_seq || 0) + 1 : 1;
        await supabase
          .from('document_sequences')
          .update({ last_seq: newSeq, year })
          .eq('doc_type', docType);
        return `${prefix}-${year}-${String(newSeq).padStart(4, '0')}`;
      } else {
        await supabase
          .from('document_sequences')
          .insert({ doc_type: docType, prefix, last_seq: 1, year });
        return `${prefix}-${year}-0001`;
      }
    } catch {
      return `${prefix}-${Date.now()}`;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [achatsRes, suppliersRes, productsRes] = await Promise.all([
        supabase.from('achats').select('*, achat_lines(*)').order('date', { ascending: false }),
        supabase.from('suppliers').select('id, name, phone, nif, wilaya').order('name'),
        supabase.from('products').select('id, designation, ref_product, prix_achat_ht, tva, current_quantity').eq('is_active', true).order('designation'),
      ]);
      if (achatsRes.data) setAchats(achatsRes.data.map(mapAchat));
      if (suppliersRes.data) setSuppliers(suppliersRes.data.map(mapSupplier));
      if (productsRes.data) setProducts(productsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const filtered = achats.filter(a => {
    const matchSearch = a.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (suppliers.find(s => s.id === a.supplierId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const ps = getPaymentStatus(a);
    const matchFilter = paymentFilter === 'all' || ps === paymentFilter;
    return matchSearch && matchFilter;
  });

  const handleSave = async (achat: Achat) => {
    try {
      const resteAPayer = Math.max(0, achat.totalTTC - (achat.montantPaye || 0));

      if (editingAchat) {
        // Update existing achat
        // Ensure status is set correctly based on payment
        let finalStatus = achat.status;
        if (achat.montantPaye > 0) {
          if (achat.montantPaye >= achat.totalTTC) {
            finalStatus = 'payé';
          } else {
            finalStatus = 'dette';
          }
        }
        await supabase.from('achats').update({
          numero: achat.numero,
          date: achat.date,
          supplier_id: achat.supplierId,
          total_ht: achat.totalHT,
          total_tva: achat.totalTVA,
          total_ttc: achat.totalTTC,
          montant_paye: achat.montantPaye || 0,
          status: finalStatus,
          payment_mode: achat.paymentMode,
          notes: achat.notes,
        }).eq('id', achat.id);

        // Delete old lines and insert new ones
        await supabase.from('achat_lines').delete().eq('achat_id', achat.id);
        const updatedLines = achat.lines.map(l => ({
          achat_id: achat.id,
          product_id: l.productId || null,
          designation: l.designation,
          quantity: l.quantity,
          prix_unit_ht: l.prixUnitHT,
          tva: l.tva,
        }));
        if (updatedLines.length > 0) {
          await supabase.from('achat_lines').insert(updatedLines);
        }
        await loadData();
      } else {
        // Create new achat
        // Ensure status is set correctly based on payment
        let finalStatus = achat.status;
        if (achat.montantPaye > 0) {
          if (achat.montantPaye >= achat.totalTTC) {
            finalStatus = 'payé';
          } else {
            finalStatus = 'dette';
          }
        }
        const { data: newAchat, error: insertErr } = await supabase.from('achats').insert({
          numero: achat.numero,
          date: achat.date,
          supplier_id: achat.supplierId,
          total_ht: achat.totalHT,
          total_tva: achat.totalTVA,
          total_ttc: achat.totalTTC,
          montant_paye: achat.montantPaye || 0,
          status: finalStatus,
          payment_mode: achat.paymentMode,
          notes: achat.notes,
        }).select().single();
        if (insertErr) throw insertErr;

        if (newAchat) {
          // Insert achat lines + update stock & prices
          const lines = achat.lines.map(l => ({
            achat_id: newAchat.id,
            product_id: l.productId || null,
            designation: l.designation,
            quantity: l.quantity,
            prix_unit_ht: l.prixUnitHT,
            tva: l.tva,
          }));
          if (lines.length > 0) {
            const { error: linesErr } = await supabase.from('achat_lines').insert(lines);
            if (linesErr) throw linesErr;
          }

          // ── Update stock & purchase price for each product ──
          for (const line of achat.lines) {
            if (!line.productId) continue;
            const { data: prod } = await supabase
              .from('products')
              .select('current_quantity, quantity_initial, prix_achat_ht, prix_vente, quantity_minimal')
              .eq('id', line.productId)
              .single();
            if (prod) {
              const newCurrentQty = (prod.current_quantity || 0) + line.quantity;
              const newInitialQty = (prod.quantity_initial || 0) + line.quantity;
              await supabase.from('products').update({
                current_quantity: newCurrentQty,
                quantity_initial: newInitialQty,
                prix_achat_ht: line.prixUnitHT,
                prix_vente: line.prixVente || prod.prix_vente || 0,
                limite_prix_vente: line.limitePrixVente,
                quantity_minimal: line.quantityMinimal || prod.quantity_minimal || 0,
              }).eq('id', line.productId);

              // Record stock movement
              await supabase.from('stock_movements').insert({
                product_id: line.productId,
                quantity_before: prod.current_quantity,
                quantity_change: line.quantity,
                quantity_after: newCurrentQty,
                reason: `Achat ${achat.numero}`,
                reference_type: 'achats',
                reference_id: newAchat.id,
              });
            }
          }

          // ── Create supplier debt if unpaid balance exists ──
          if (resteAPayer > 0 && achat.supplierId) {
            await supabase.from('debts').insert({
              supplier_id: achat.supplierId,
              total_amount: achat.totalTTC,
              paid_amount: achat.montantPaye || 0,
              date: achat.date,
              invoice_number: achat.numero,
              description: `Achat ${achat.numero} - Reste à payer`,
            });
          }
        }
      }
      await loadData();
    } catch (err) {
      console.error('Error saving achat:', err);
      alert('Erreur lors de l\'enregistrement: ' + (err as any)?.message);
    }
    setShowForm(false);
    setEditingAchat(undefined);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) {
      try {
        // Delete lines first
        await supabase.from('achat_lines').delete().eq('achat_id', id);
        // Delete achat
        await supabase.from('achats').delete().eq('id', id);
        await loadData();
      } catch (err) {
        console.error('Error deleting achat:', err);
      }
      setViewingAchat(undefined);
    }
  };

  const totalTTC = achats.reduce((s, a) => s + a.totalTTC, 0);
  const ordered = achats.filter(a => a.status === 'commande').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
            Achats
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gestion complète des commandes fournisseurs et approvisionnements</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingAchat(undefined); setShowForm(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-emerald-500/40 transition-all w-full md:w-auto"
        >
          <Plus size={20} />
          Nouveau Achat
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl hover:shadow-emerald-500/40 transition-all col-span-2"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <span className="text-xs font-bold uppercase tracking-widest">Montant Total TTC</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight">{fmt(totalTTC)}</h2>
            <div className="mt-4 flex gap-4">
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Total Achats</p>
                <p className="text-lg font-black">{achats.length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Commandés</p>
                <p className="text-lg font-black">{ordered}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-emerald-50/30 rounded-3xl p-6 border border-emerald-100/50 shadow-xl"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition par statut</h3>
          <div className="space-y-3">
            {Object.entries(STATUS_MAP).map(([key, val]) => {
              const count = achats.filter(a => a.status === key).length;
              const pct = achats.length ? Math.round(count / achats.length * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                    <span>{val.label}</span><span>{count}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 rounded-full"
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
        className="bg-gradient-to-br from-white to-emerald-50/20 rounded-3xl border border-emerald-100/50 shadow-xl overflow-hidden"
      >
        {/* Table Header */}
        <div className="p-6 md:p-8 border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-900">Liste des Achats</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par N° ou fournisseur..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm font-medium focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none shadow-sm"
            >
              <option value="all">Tous</option>
              <option value="payé">✅ Payée</option>
              <option value="dette">⚠️ En Dette</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold mb-2">
              {achats.length === 0 ? 'Aucun achat créé' : 'Aucun résultat trouvé'}
            </p>
            {achats.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="text-emerald-600 hover:text-emerald-700 font-bold text-sm"
              >
                Créer le premier achat
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-b border-emerald-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">N° Commande</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fournisseur</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Articles</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Montant TTC</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/50">
                {filtered.map(achat => (
                  <motion.tr
                    key={achat.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-emerald-50/50 transition-all"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{achat.numero}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{suppliers.find(s => s.id === achat.supplierId)?.name || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                        {achat.lines.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">
                      {fmt(achat.totalTTC)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const ps = getPaymentStatus(achat);
                        const paidPct = achat.totalTTC > 0 ? Math.round((achat.montantPaye / achat.totalTTC) * 100) : 0;
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${
                              ps === 'payé' ? 'bg-emerald-100 text-emerald-700' :
                              ps === 'dette' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {ps === 'payé' ? '✅ Payée' : ps === 'dette' ? '⚠️ En Dette' : 'Non payé'}
                            </span>
                            {achat.totalTTC > 0 && (
                              <div className="w-full bg-gray-200 rounded-full h-1.5 min-w-[70px]">
                                <div className={`h-1.5 rounded-full ${
                                  ps === 'payé' ? 'bg-emerald-500' : 'bg-red-400'
                                }`} style={{ width: `${Math.min(paidPct, 100)}%` }} />
                              </div>
                            )}
                            {achat.montantPaye > 0 && <span className="text-[10px] text-gray-400 font-semibold">{fmt(achat.montantPaye)} / {fmt(achat.totalTTC)}</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {new Date(achat.date).toLocaleDateString('fr-DZ')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {getPaymentStatus(achat) === 'dette' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPayingAchat(achat)}
                            className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all font-bold"
                            title="Payer la dette"
                          >
                            <CreditCard size={16} />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewingAchat(achat)}
                          className="p-2 text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-all"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setEditingAchat(achat); setShowForm(true); }}
                          className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => printAchat(achat, suppliers.find(s => s.id === achat.supplierId), settings)}
                          className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all"
                          title="Imprimer"
                        >
                          <Printer size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (window.confirm('Êtes-vous sûr ?')) handleDelete(achat.id);
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
          <AchatForm
            achat={editingAchat}
            suppliers={suppliers}
            products={products}
            generateNumero={generateNumero}
            onClose={() => { setShowForm(false); setEditingAchat(undefined); }}
            onSave={handleSave}
          />
        )}
        {viewingAchat && (
          <ViewModal
            achat={viewingAchat}
            suppliers={suppliers}
            onClose={() => setViewingAchat(undefined)}
            settings={settings}
          />
        )}
        {payingAchat && (
          <AchatPayDebtModal
            achat={payingAchat}
            supplier={suppliers.find(s => s.id === payingAchat.supplierId)}
            onClose={() => setPayingAchat(undefined)}
            onPaid={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
