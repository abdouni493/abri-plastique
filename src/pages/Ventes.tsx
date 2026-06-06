/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ventes — Professional Sales Management Interface
 * Redesigned with same architecture as Inventaire
 * Color Scheme: Indigo/Blue/Purple
 */

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Printer, Eye, X,
  ShoppingCart, TrendingUp, Calendar, User, Check,
  Filter, ChevronDown, Upload, Download, Info, CreditCard, UserPlus, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { uploadJustificatif, downloadImage } from '../lib/storage';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleClient {
  id: string;
  name: string;
  phone: string;
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
  ninNumber?: string;
  rcNumber?: string;
  artNumber?: string;
  ifNumber?: string;
  isNumber?: string;
  compteBancaire?: string;
  limitationCredit?: number;
  soldeInitial?: number;
  dateInitial?: string;
  famille?: string;
  sousFamille?: string;
}

interface SaleLine {
  id: string;
  productId?: string | null;
  designation: string;
  quantity: number;
  prixUnitHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
  nbreColis?: number;
  colisage?: number;
  barCode?: string;
}

interface Vente {
  id: string;
  numero: string;
  date: string;
  clientId: string | null;
  lines: SaleLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  timbreAmount: number;
  remiseActive: boolean;
  remisePct: number;
  remiseMontant: number;
  montantPaye: number;
  status: 'brouillon' | 'confirme' | 'envoye';
  notes: string;
  paymentMode: 'especes' | 'virement' | 'cheque' | 'traite' | 'a_terme';
  proof?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mapVente = (row: any): Vente => ({
  id: row.id,
  numero: row.numero,
  date: row.date,
  clientId: row.client_id,
  lines: (row.vente_lines || []).map((l: any) => ({
    id: l.id,
    productId: l.product_id || null,
    designation: l.designation,
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
  montantPaye: row.montant_paye || 0,
  status: row.status,
  notes: row.notes || '',
  paymentMode: row.payment_mode || 'especes',
  proof: row.proof || undefined,
});

const mapClient = (row: any): SaleClient => ({
  id: row.id,
  name: row.name,
  phone: row.phone || '',
  email: row.email,
  taxId: row.tax_id,
  wilaya: row.wilaya,
  commune: row.commune,
  activite: row.activite,
  codePostal: row.code_postal,
  address: row.address,
  notes: row.notes,
  isSpecial: row.is_special || false,
  specialNote: row.special_note,
  ninNumber: row.nin_number,
  rcNumber: row.rc_number,
  artNumber: row.art_number,
  ifNumber: row.if_number,
  isNumber: row.is_number,
  compteBancaire: row.compte_bancaire,
  limitationCredit: row.limitation_credit,
  soldeInitial: row.solde_initial,
  dateInitial: row.date_initial,
  famille: row.famille,
  sousFamille: row.sous_famille,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA';

const fmtNum = (n: number) =>
  new Intl.NumberFormat('fr-DZ').format(n);

const genId = () => Math.random().toString(36).substr(2, 9);

const VENTE_PAYMENT_STATUS = {
  payé: { label: 'Payée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  dette: { label: 'En Dette', color: 'text-red-700', bg: 'bg-red-100' },
  non_paye: { label: 'Non Payé', color: 'text-amber-700', bg: 'bg-amber-100' },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirme: { label: 'Confirmée', color: 'text-blue-700', bg: 'bg-blue-100' },
  envoye: { label: 'Envoyée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  payé: { label: '✅ Payée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  dette: { label: '⚠️ En Dette', color: 'text-red-700', bg: 'bg-red-100' },
};

const getVentePaymentStatus = (v: Vente): 'payé' | 'dette' => {
  if (v.montantPaye >= v.totalTTC && v.totalTTC > 0) return 'payé';
  return 'dette';
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden"
          >
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.designation}</p>
                  {p.bar_code && (
                    <p className="text-xs text-gray-400 font-mono">{p.bar_code}</p>
                  )}
                  <p className="text-xs text-gray-400 font-semibold">TVA {p.tva}%</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-indigo-600">{fmt(p.prix_vente)}</p>
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
  entities: SaleClient[];
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
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden"
          >
            {results.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-indigo-600" />
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

// ─── Print Function ───────────────────────────────────────────────────────────

function printVente(vente: Vente, client: SaleClient | undefined, settings?: any) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) return;

  const lines = vente.lines.map((l, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><strong>${l.designation}</strong></td>
      <td class="center">${fmtNum(l.quantity)}</td>
      ${l.nbreColis ? `<td class="center">${l.nbreColis}</td>` : '<td class="center">-</td>'}
      ${l.colisage ? `<td class="center">${l.colisage}</td>` : '<td class="center">-</td>'}
      <td class="right">${fmt(l.prixUnitHT)}</td>
      <td class="center">${l.tva}%</td>
      <td class="right"><strong>${fmt(l.totalHT)}</strong></td>
      <td class="right"><strong>${fmt(l.totalTTC)}</strong></td>
    </tr>
  `).join('');

  const currentDate = new Date().toLocaleDateString('fr-DZ');
  const totalWithTimbre = vente.totalTTC + vente.timbreAmount;
  const reste = Math.max(0, totalWithTimbre - vente.montantPaye);

  const htmlTemplate = `
    <!DOCTYPE html>
    <html dir="ltr" lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Facture de Vente - ${vente.numero}</title>
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
        
        .company-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 15px; gap: 15px; }
        .company-logo { width: 60px; height: 60px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2); flex-shrink: 0; overflow: hidden; }
        .company-logo img { width: 100%; height: 100%; object-fit: contain; }
        .company-info { flex: 1; }
        .company-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
        .company-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #666; }
        .company-details div { display: flex; flex-direction: column; gap: 1px; }
        .company-details label { font-weight: 600; text-transform: uppercase; font-size: 8px; color: #999; letter-spacing: 0.3px; }
        .company-details span { font-weight: 500; color: #333; font-size: 10px; }
        
        .document-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px; border-left: 3px solid #4f46e5; }
        .document-title h1 { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 900; color: #1a1a1a; }
        .document-title p { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .doc-ref { text-align: right; }
        .doc-ref .label { font-size: 8px; font-weight: 700; color: #999; }
        .doc-ref .value { font-size: 11px; font-weight: 700; color: #4f46e5; }
        
        .parties-section { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
        .party-box { padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; border-left: 3px solid #4f46e5; }
        .party-box label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #999; }
        .party-box .value { font-size: 11px; font-weight: 600; color: #1a1a1a; margin-top: 3px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
        thead tr { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; }
        th { padding: 8px; text-align: left; font-weight: 700; }
        td { padding: 7px; border-bottom: 1px solid #f0f0f0; }
        .right { text-align: right; }
        .center { text-align: center; }
        
        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 15px; }
        .totals-box { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 12px 16px; min-width: 250px; border-radius: 8px; }
        .totals-box .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
        .totals-box .total-row { border-top: 1.5px solid rgba(255,255,255,0.3); padding-top: 8px; margin-top: 8px; font-weight: 900; font-size: 13px; }
        
        .payment-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
        .payment-box { padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
        .payment-box label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #999; }
        .payment-box .value { font-size: 12px; font-weight: 700; color: #1a1a1a; margin-top: 3px; }
        
        .notes-section { padding: 10px; background: #e0e7ff; border-left: 3px solid #4f46e5; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
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
            ${settings?.logo ? `<img src="${settings.logo}">` : 'SV'}
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
        </div>
        
        <div class="document-header">
          <div class="document-title">
            <h1>Facture de Vente</h1>
            <p>Facture Commerciale</p>
          </div>
          <div class="doc-ref">
            <div class="label">Numero:</div>
            <div class="value">${vente.numero}</div>
            <div class="label" style="margin-top: 4px;">Date:</div>
            <div class="value">${vente.date}</div>
          </div>
        </div>
        
        <div class="parties-section">
          <div class="party-box">
            <label>Vendeur</label>
            <div class="value">${settings?.name || 'ABRI PLASTIQUE'}<br>${settings?.address || 'Alger, Algérie'}</div>
          </div>
          ${client ? `
          <div class="party-box">
            <label>Client</label>
            <div class="value">${client.name}${client.phone ? '<br>' + client.phone : ''}${client.wilaya ? '<br>' + client.wilaya : ''}${client.taxId ? '<br>NIF: ' + client.taxId : ''}</div>
          </div>
          ` : '<div class="party-box"><label>Client</label><div class="value">Non spécifié</div></div>'}
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="center" style="width: 5%;">#</th>
              <th style="width: 35%;">Désignation</th>
              <th class="center" style="width: 10%;">Quantité</th>
              <th class="center" style="width: 8%;">Nbre Colis</th>
              <th class="center" style="width: 8%;">Colisage</th>
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
            <div class="row"><span>Total HT:</span><span>${fmt(vente.totalHT)}</span></div>
            <div class="row"><span>Total TVA:</span><span>${fmt(vente.totalTVA)}</span></div>
            <div class="row total-row"><span>Sous-total TTC:</span><span>${fmt(vente.totalTTC)}</span></div>
            ${vente.remiseActive && vente.remiseMontant > 0 ? `<div class="row" style="color: #ea580c;"><span>Remise (${vente.remisePct}%):</span><span>- ${fmt(vente.remiseMontant)}</span></div>` : ''}
            ${vente.timbreAmount > 0 ? `<div class="row" style="color: #059669;"><span>Timbre (Taxe):</span><span>+ ${fmt(vente.timbreAmount)}</span></div>` : ''}
            <div class="row total-row"><span>TOTAL TTC:</span><span>${fmt((vente.totalTTC - (vente.remiseMontant || 0) + (vente.timbreAmount || 0)))}</span></div>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="payment-box">
            <label>Mode Paiement</label>
            <div class="value">${vente.paymentMode === 'a_terme' ? 'À terme' : vente.paymentMode === 'especes' ? 'Espèces' : vente.paymentMode === 'virement' ? 'Virement Bancaire' : vente.paymentMode === 'cheque' ? 'Chèque' : vente.paymentMode === 'traite' ? 'Traite' : vente.paymentMode}</div>
          </div>
          <div class="payment-box">
            <label>Montant Paye</label>
            <div class="value">${fmt(vente.montantPaye)}</div>
          </div>
          <div class="payment-box">
            <label>Solde Restant</label>
            <div class="value" style="color: ${reste > 0 ? '#ef4444' : '#10b981'};">${fmt(reste)}</div>
          </div>
        </div>
        
        ${vente.notes ? `
        <div class="notes-section">
          <label>Notes / Remarques:</label>
          <div style="margin-top: 5px;">${vente.notes}</div>
        </div>
        ` : ''}
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-label">Signature Vendeur</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-label">Client Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-label">Cachet Entreprise</div>
          </div>
        </div>
        
        <div class="footer-section">
          <p>Facture generee le ${currentDate}</p>
          <p style="margin-top: 2px;">Merci pour votre confiance | SAF-Cash</p>
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
  win.onafterprint = () => {
    document.body.removeChild(iframe);
    window.location.reload();
  };
  win.focus();
  win.print();
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ vente, clients, onClose, settings }: {
  vente: Vente;
  clients: SaleClient[];
  onClose: () => void;
  settings?: any;
}) {
  const client = clients.find(c => c.id === vente.clientId);
  const st = STATUS_MAP[vente.status];

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
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">{vente.numero}</h2>
            <p className="text-indigo-200 text-sm font-semibold mt-0.5">{vente.date}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Client</p>
              <p className="text-lg font-bold text-gray-900">{client?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Statut</p>
              <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${st.bg} ${st.color}`}>
                {st.label}
              </span>
            </div>
          </div>

          {vente.lines.length > 0 && (
            <div className="bg-indigo-50/30 rounded-2xl border border-indigo-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-50/80 border-b border-indigo-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Désignation</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Qté</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Nbre Colis</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Colisage</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">P.U HT</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">TVA</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100/50">
                    {vente.lines.map(line => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{line.designation}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-600">{fmtNum(line.quantity)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{line.nbreColis || '-'}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{line.colisage || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(line.prixUnitHT)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">{line.tva}%</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-indigo-700">{fmt(line.totalTTC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-4 border-t border-indigo-100">
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 min-w-64 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{fmt(vente.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{fmt(vente.totalTVA)}</span>
                  </div>
                  {vente.remiseActive && (
                    <div className="flex justify-between text-sm font-semibold text-rose-600">
                      <span>Remise (-{vente.remisePct}%):</span>
                      <span>-{fmt(vente.remiseMontant)}</span>
                    </div>
                  )}
                  {vente.timbreAmount > 0 && (
                    <div className="flex justify-between text-sm font-semibold text-amber-600">
                      <span>Timbre Fiscal:</span>
                      <span>+{fmt(vente.timbreAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-indigo-700 border-t border-indigo-200 pt-2">
                    <span>TOTAL FINAL:</span>
                    <span>{fmt(vente.totalTTC - (vente.remiseMontant || 0) + (vente.timbreAmount || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {vente.notes && (
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Remarques</p>
              <p className="text-sm text-gray-700">{vente.notes}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-indigo-100 bg-indigo-50/30 flex flex-col gap-3 shrink-0">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
              Fermer
            </button>
            <button
              onClick={() => printVente(vente, client, settings)}
              className="flex-1 flex items-center gap-2 justify-center px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/40 hover:shadow-xl transition-all"
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

// ─── New Client Modal ────────────────────────────────────────────────────────

function NewClientModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (client: SaleClient) => void;
}) {
  const [form, setForm] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    taxId: '', 
    wilaya: '',
    commune: '',
    activite: '',
    codePostal: '',
    address: '',
    notes: '',
    isSpecial: false,
    specialNote: '',
    ninNumber: '', rcNumber: '', artNumber: '', ifNumber: '', isNumber: '',
    compteBancaire: '', limitationCredit: 0, soldeInitial: 0, dateInitial: '',
    famille: '', sousFamille: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        name: form.name,
        phone: form.phone,
        email: form.email,
        tax_id: form.taxId,
        wilaya: form.wilaya,
        commune: form.commune,
        activite: form.activite,
        code_postal: form.codePostal,
        address: form.address,
        notes: form.notes,
        is_special: form.isSpecial,
        special_note: form.specialNote,
        nin_number: form.ninNumber,
        rc_number: form.rcNumber,
        art_number: form.artNumber,
        if_number: form.ifNumber,
        is_number: form.isNumber,
        compte_bancaire: form.compteBancaire,
        limitation_credit: form.limitationCredit,
        solde_initial: form.soldeInitial,
        date_initial: form.dateInitial || null,
        famille: form.famille,
        sous_famille: form.sousFamille,
      }).select().single();

      if (error) throw error;
      if (data) {
        onCreated(mapClient(data));
      }
    } catch (err: any) {
      console.error('Error creating client:', err);
      alert('Erreur lors de la création du client: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-center items-start pt-4 md:pt-10 p-4 overflow-y-auto">
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
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-8 py-6">
          <h2 className="text-xl font-black text-white">Nouveau Client</h2>
        </div>
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-4 pb-2 border-b border-indigo-200">Informations de Base</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nom du client"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Numéro de téléphone"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activité</label>
                <input
                  type="text"
                  value={form.activite}
                  onChange={e => setForm(f => ({ ...f, activite: e.target.value }))}
                  placeholder="Activité"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-4 pb-2 border-b border-indigo-200">Localisation</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Adresse</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wilaya</label>
                <input
                  value={form.wilaya}
                  onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}
                  placeholder="Wilaya"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Commune</label>
                <input
                  value={form.commune}
                  onChange={e => setForm(f => ({ ...f, commune: e.target.value }))}
                  placeholder="Commune"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Code Postal</label>
                <input
                  value={form.codePostal}
                  onChange={e => setForm(f => ({ ...f, codePostal: e.target.value }))}
                  placeholder="Code postal"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Catégorisation */}
          <div>
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-4 pb-2 border-b border-indigo-200">Catégorisation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Famille</label>
                <input
                  type="text"
                  value={form.famille}
                  onChange={e => setForm(f => ({ ...f, famille: e.target.value }))}
                  placeholder="Famille"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sous-Famille</label>
                <input
                  type="text"
                  value={form.sousFamille}
                  onChange={e => setForm(f => ({ ...f, sousFamille: e.target.value }))}
                  placeholder="Sous-famille"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Identification Fiscale */}
          <div>
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-4 pb-2 border-b border-indigo-200">Identification Fiscale & Finance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">NIF</label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))}
                  placeholder="Numéro d'impôt"
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° NIN</label>
                <input value={form.ninNumber || ''} onChange={e => setForm(f => ({ ...f, ninNumber: e.target.value }))}
                  placeholder="Numéro NIN" className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° RC</label>
                <input value={form.rcNumber || ''} onChange={e => setForm(f => ({ ...f, rcNumber: e.target.value }))}
                  placeholder="RC" className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° ART</label>
                <input value={form.artNumber || ''} onChange={e => setForm(f => ({ ...f, artNumber: e.target.value }))}
                  placeholder="Article" className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° IF</label>
                <input value={form.ifNumber || ''} onChange={e => setForm(f => ({ ...f, ifNumber: e.target.value }))}
                  placeholder="N° IF" className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° IS</label>
                <input value={form.isNumber || ''} onChange={e => setForm(f => ({ ...f, isNumber: e.target.value }))}
                  placeholder="N° IS" className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Compte Bancaire</label>
                <input value={form.compteBancaire || ''} onChange={e => setForm(f => ({ ...f, compteBancaire: e.target.value }))}
                  placeholder="RIB / Compte" className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Limitation de Crédit</label>
                <input type="number" min="0" value={form.limitationCredit || 0}
                  onChange={e => setForm(f => ({ ...f, limitationCredit: Number(e.target.value) }))}
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Solde Initial</label>
                <input type="number" value={form.soldeInitial || 0}
                  onChange={e => setForm(f => ({ ...f, soldeInitial: Number(e.target.value) }))}
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Initial</label>
                <input type="date" value={form.dateInitial || ''}
                  onChange={e => setForm(f => ({ ...f, dateInitial: e.target.value }))}
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-4 pb-2 border-b border-indigo-200">Observations</h3>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none resize-none"
              placeholder="Ajouter des notes..."
            />
          </div>

          {/* Special Client */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isSpecial"
                checked={form.isSpecial || false}
                onChange={e => setForm(f => ({ ...f, isSpecial: e.target.checked }))}
                className="w-4 h-4 rounded-lg border-2 border-amber-300 cursor-pointer accent-amber-500"
              />
              <label htmlFor="isSpecial" className="font-bold text-sm text-amber-900 cursor-pointer">
                ⭐ Client Spécial (prix négociable)
              </label>
            </div>
            {form.isSpecial && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Note sur ce client spécial</label>
                <textarea
                  value={form.specialNote || ''}
                  onChange={e => setForm(f => ({ ...f, specialNote: e.target.value }))}
                  rows={2}
                  className="w-full bg-white border border-amber-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/30 focus:border-amber-500 outline-none resize-none"
                  placeholder="Ex: Conditions spéciales de tarification..."
                />
              </div>
            )}
          </div>
        </div>
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Créer Client'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

const VenteForm: React.FC<{
  vente?: Vente;
  clients: SaleClient[];
  products: any[];
  timbres: any[];
  generateNumero: (prefix: string, docType: string) => Promise<string>;
  onClose: () => void;
  onSave: (v: Vente) => void;
}> = function({ vente, clients: initialClients, products, timbres, generateNumero, onClose, onSave }) {
  const isNew = !vente;
  const [clients, setClients] = useState<SaleClient[]>(initialClients);
  const [showNewClient, setShowNewClient] = useState(false);
  const [montantPaye, setMontantPaye] = useState<number>(vente?.montantPaye || 0);

  const [form, setForm] = useState<Vente>(vente || {
    id: genId(),
    numero: 'VNT-TMP',
    date: new Date().toISOString().split('T')[0],
    clientId: null,
    lines: [],
    totalHT: 0,
    totalTVA: 0,
    totalTTC: 0,
    timbreAmount: 0,
    remiseActive: false,
    remisePct: 0,
    remiseMontant: 0,
    montantPaye: 0,
    status: 'brouillon' as const,
    notes: '',
    paymentMode: 'especes' as const,
  });

  const resteAPayer = Math.max(0, (form.totalTTC - form.remiseMontant + form.timbreAmount) - montantPaye);

  // Generate numero for new ventes
  useEffect(() => {
    if (isNew && form.numero === 'VNT-TMP') {
      generateNumero('VNT', 'vente').then(numero => {
        setForm(f => ({ ...f, numero }));
      });
    }
  }, [isNew]);

  const recalc = (lines: SaleLine[]) => {
    const totalHT = lines.reduce((s, l) => s + l.totalHT, 0);
    const totalTVA = lines.reduce((s, l) => s + (l.totalHT * l.tva / 100), 0);
    const totalTTC = totalHT + totalTVA;
    
    // Find matching active timbre - apply AFTER remise
    let timbreAmount = 0;
    const totalAfterRemise = form.remiseActive ? totalTTC - (totalTTC * form.remisePct / 100) : totalTTC;
    const activeTimbre = timbres.find(t => t.isActive && totalAfterRemise >= t.minAmount && totalAfterRemise <= t.maxAmount);
    if (activeTimbre) {
      timbreAmount = totalAfterRemise * activeTimbre.percentage / 100;
    }
    
    return { totalHT, totalTVA, totalTTC, timbreAmount };
  };

  const addProduct = (p: any) => {
    const line: SaleLine = {
      id: genId(),
      productId: p.id,
      designation: p.designation,
      quantity: 1,
      prixUnitHT: p.prix_vente,
      tva: p.tva,
      totalHT: p.prix_vente,
      totalTTC: p.prix_vente * (1 + p.tva / 100),
      barCode: p.bar_code,
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
    try {
      const updatedForm = { ...form, montantPaye };
      onSave(updatedForm);
      onClose();
    } catch (err) {
      console.error('Error saving vente:', err);
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
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">{isNew ? 'Nouvelle' : 'Modifier'} Vente</h2>
            <p className="text-indigo-200 text-sm font-semibold mt-0.5">{form.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Facture</label>
              <input
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode Paiement</label>
              <select
                value={form.paymentMode}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value as any }))}
                className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                <option value="especes">Espèces</option>
                <option value="virement">Virement Bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="traite">Traite</option>
                <option value="a_terme">À terme</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client</label>
              <button
                type="button"
                onClick={() => setShowNewClient(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-all"
              >
                <UserPlus size={12} />
                Nouveau Client
              </button>
            </div>
            <EntitySearch
              entities={clients}
              onSelect={(c) => setForm(f => ({ ...f, clientId: c.id }))}
              placeholder="Rechercher un client..."
              icon={User}
            />
            {form.clientId && (
              (() => {
                const selectedClient = clients.find(c => c.id === form.clientId);
                return (
                  <div className="mt-2 space-y-2">
                    <div className={`px-3 py-2 rounded-xl flex items-center justify-between ${
                      selectedClient?.isSpecial
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-indigo-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${selectedClient?.isSpecial ? 'text-amber-700' : 'text-indigo-700'}`}>
                          {selectedClient?.isSpecial && '⭐ '}
                          {selectedClient?.name}
                        </span>
                        {selectedClient?.isSpecial && (
                          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                            Spécial
                          </span>
                        )}
                      </div>
                      <button onClick={() => setForm(f => ({ ...f, clientId: null }))} className="text-indigo-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                    {selectedClient?.isSpecial && selectedClient?.specialNote && (
                      <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 font-semibold italic">
                        📝 {selectedClient.specialNote}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
            <AnimatePresence>
              {showNewClient && (
                <NewClientModal
                  onClose={() => setShowNewClient(false)}
                  onCreated={(newClient) => {
                    setClients(prev => [...prev, newClient]);
                    setForm(f => ({ ...f, clientId: newClient.id }));
                    setShowNewClient(false);
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ajouter des Produits</label>
            <ProductSearch products={products} onSelect={addProduct} placeholder="Rechercher un produit..." />
          </div>

          {form.lines.length > 0 ? (
            <div className="bg-gradient-to-br from-indigo-50/30 to-blue-50/20 rounded-2xl border border-indigo-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-b border-indigo-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Code Barre</th>
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
                  <tbody className="divide-y divide-indigo-100/50">
                    {form.lines.map(line => (
                      <tr key={line.id} className="hover:bg-white/60 transition-all">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {line.barCode || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-gray-900">{line.designation}</div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                            className="w-full text-center bg-white border border-indigo-200 rounded-lg py-1.5 px-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={line.nbreColis || ''}
                            onChange={e => updateLine(line.id, 'nbreColis', Number(e.target.value) || 0)}
                            className="w-full text-center bg-white border border-indigo-200 rounded-lg py-1.5 px-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={line.colisage || ''}
                            onChange={e => updateLine(line.id, 'colisage', Number(e.target.value) || 0)}
                            className="w-full text-center bg-white border border-indigo-200 rounded-lg py-1.5 px-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const currentClient = clients.find(c => c.id === form.clientId);
                            const isClientSpecial = currentClient?.isSpecial || false;
                            return (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.prixUnitHT}
                                  readOnly={!isClientSpecial}
                                  onChange={isClientSpecial ? (e => updateLine(line.id, 'prixUnitHT', Number(e.target.value))) : undefined}
                                  className={`flex-1 text-right border border-indigo-200 rounded-lg py-1.5 px-2 text-sm font-bold outline-none transition-all ${
                                    isClientSpecial
                                      ? 'bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-text'
                                      : 'bg-gray-100 cursor-not-allowed text-gray-600'
                                  }`}
                                />
                                {!isClientSpecial && (
                                  <Lock size={12} className="text-gray-400 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.tva}
                            onChange={e => updateLine(line.id, 'tva', Number(e.target.value))}
                            className="w-full text-center bg-white border border-indigo-200 rounded-lg py-1.5 px-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-black text-indigo-700">{fmt(line.totalTTC)}</td>
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

              <div className="flex justify-end p-4 border-t border-indigo-100">
                <div className="min-w-72 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{fmt(form.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{fmt(form.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-indigo-700 border-t border-indigo-200 pt-2">
                    <span>Sous-total TTC:</span>
                    <span>{fmt(form.totalTTC)}</span>
                  </div>

                  {/* Remise Section */}
                  <div className="flex items-center gap-4 py-3 px-3 bg-orange-50 rounded-lg border border-orange-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.remiseActive}
                        onChange={e => setForm(f => ({ ...f, remiseActive: e.target.checked }))}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-sm">Remise</span>
                    </label>
                    {form.remiseActive && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={form.remisePct}
                          onChange={e => {
                            const pct = Number(e.target.value);
                            setForm(f => ({
                              ...f,
                              remisePct: pct,
                              remiseMontant: (f.totalTTC * pct) / 100,
                            }));
                          }}
                          className="w-16 border rounded-lg px-2 py-1 text-sm font-bold"
                        />
                        <span className="text-sm font-bold text-gray-500">%</span>
                        <span className="text-sm text-red-600 font-bold">
                          - {fmt(form.remiseMontant)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`flex justify-between text-lg font-black border-t-2 border-indigo-300 pt-2 ${form.remiseActive ? 'text-emerald-700' : 'text-indigo-700'}`}>
                    <span>TOTAL FINAL = TTC - Remise + Timbre:</span>
                    <span>{fmt(form.totalTTC - form.remiseMontant)}</span>
                  </div>

                  {form.timbreAmount > 0 && (
                    <div className="flex justify-between text-sm font-semibold text-emerald-700 bg-emerald-50 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl border-t border-emerald-200">
                      <span>Timbre (Taxe):</span>
                      <span>+ {fmt(form.timbreAmount)}</span>
                    </div>
                  )}
                  {/* Payment section */}
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-indigo-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Montant Payé</label>
                      <div className="relative w-40">
                        <input
                          type="number"
                          min="0"
                          max={form.totalTTC + form.timbreAmount}
                          value={montantPaye}
                          onChange={e => setMontantPaye(Math.min(form.totalTTC + form.timbreAmount, Math.max(0, Number(e.target.value))))}
                          className="w-full text-right bg-white border-2 border-indigo-400 rounded-xl py-2 px-3 text-sm font-black text-indigo-700 focus:ring-4 focus:ring-indigo-500/20 outline-none"
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
                        Le solde restant sera enregistré comme dette client
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200 p-8 text-center mb-6">
              <ShoppingCart className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-indigo-700 font-semibold">Aucun produit. Commencez par ajouter des articles.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarques</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
              placeholder="Ajouter des remarques spécifiques..."
            />
          </div>


        </div>

        <div className="px-8 py-5 border-t border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 flex justify-between shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/40 hover:shadow-xl transition-all"
          >
            <>
              <Check size={16} />
              Enregistrer
            </>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Debt Payment Modal ────────────────────────────────────────────────────────

function VentePayDebtModal({ vente, client, onClose, onPaid }: {
  vente: Vente;
  client: SaleClient | undefined;
  onClose: () => void;
  onPaid: () => void;
}) {
  const reste = Math.max(0, vente.totalTTC - (vente.montantPaye || 0));
  const [payAmount, setPayAmount] = useState<string>(String(reste));
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Math.min(Number(payAmount) || 0, reste);
  const newPaid = (vente.montantPaye || 0) + amountNum;
  const newReste = Math.max(0, vente.totalTTC - newPaid);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Reçu de Paiement — ${vente.numero}</title>
      <style>
        body{font-family:'Segoe UI',Arial;padding:40px;font-size:13px;}
        h1{color:#4f46e5;font-size:22px;margin-bottom:4px;}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;}
        .label{color:#666;font-weight:600;}
        .val{font-weight:900;}
        .total{font-size:18px;color:#4f46e5;border-top:2px solid #4f46e5;padding-top:12px;margin-top:12px;}
      </style></head><body>
      <h1>Reçu de Paiement</h1>
      <p style="color:#666;margin-bottom:24px;">Facture: <strong>${vente.numero}</strong> · Client: <strong>${client?.name || 'N/A'}</strong></p>
      <div class="row"><span class="label">Montant Total Facture</span><span class="val">${fmt(vente.totalTTC)}</span></div>
      <div class="row"><span class="label">Déjà Payé</span><span class="val">${fmt(vente.montantPaye || 0)}</span></div>
      <div class="row"><span class="label">Ce Paiement</span><span class="val" style="color:#ef4444;">${fmt(amountNum)}</span></div>
      <div class="row total"><span>Nouveau Solde Restant</span><span>${fmt(newReste)}</span></div>
      <p style="margin-top:40px;color:#999;font-size:11px;">Imprimé le ${new Date().toLocaleDateString('fr-DZ')}</p>
      <script>window.onload=()=>window.print();</script></body></html>
    `);
    win.document.close();
  };

  const handleSave = async () => {
    if (amountNum <= 0) { setError('Montant invalide'); return; }
    setSaving(true); setError(null);
    try {
      // Update vente montant_paye
      const newStatus = newPaid >= vente.totalTTC ? 'payé' : 'dette';
      await supabase.from('ventes').update({
        montant_paye: newPaid,
      }).eq('id', vente.id);

      // Update or create client debt if needed
      if (newReste > 0 && vente.clientId) {
        const { data: existingDebt } = await supabase
          .from('client_debts')
          .select('*')
          .eq('vente_id', vente.id)
          .maybeSingle();

        if (existingDebt) {
          await supabase.from('client_debts').update({
            paid_amount: newPaid,
          }).eq('id', existingDebt.id);
        }
      }

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
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2"><CreditCard size={20} />Payer la Dette</h2>
            <p className="text-indigo-200 text-xs font-semibold mt-0.5">{vente.numero} · {client?.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={18} /></button>
        </div>

        <div className="p-7 space-y-4">
          {/* Invoice Summary */}
          <div className="bg-indigo-50/60 rounded-2xl border border-indigo-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Total Facture</span>
              <span className="font-black text-gray-900">{fmt(vente.totalTTC)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Déjà Payé</span>
              <span className="font-black text-indigo-700">{fmt(vente.montantPaye || 0)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-indigo-200 pt-2">
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
              className="w-full border-2 border-indigo-400 rounded-xl py-3 px-4 text-lg font-black text-indigo-700 focus:ring-4 focus:ring-indigo-500/20 outline-none text-right"
            />
          </div>

          {/* Result preview */}
          {amountNum > 0 && (
            <div className={`rounded-xl p-4 border-2 ${
              newReste <= 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-amber-50 border-amber-300 text-amber-800'
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
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-4 focus:ring-indigo-500/20 outline-none" />
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
            className="flex-1 py-3 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
            {saving ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VentesPage() {
  const { settings, timbres } = useApp();
  const { hasPermission } = useAuth();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [clients, setClients] = useState<SaleClient[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVente, setEditingVente] = useState<Vente | undefined>();
  const [viewingVente, setViewingVente] = useState<Vente | undefined>();
  const [payingVente, setPayingVente] = useState<Vente | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      const [ventesRes, clientsRes, productsRes] = await Promise.all([
        supabase.from('ventes').select('*, vente_lines(*)').order('date', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('products').select('id, designation, ref_product, bar_code, prix_vente, tva, current_quantity').eq('is_active', true).order('designation'),
      ]);
      if (ventesRes.data) setVentes(ventesRes.data.map(mapVente));
      if (clientsRes.data) setClients(clientsRes.data.map(mapClient));
      if (productsRes.data) setProducts(productsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const filtered = ventes.filter(v => {
    const matchSearch = v.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clients.find(c => c.id === v.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const paymentStatus = getVentePaymentStatus(v);
    const matchStatus = statusFilter === 'all' || paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (vente: Vente) => {
    try {
      const resteAPayer = Math.max(0, (vente.totalTTC - (vente.remiseMontant || 0) + (vente.timbreAmount || 0)) - (vente.montantPaye || 0));

      if (editingVente) {
        // Update existing vente
        await supabase.from('ventes').update({
          numero: vente.numero,
          date: vente.date,
          client_id: vente.clientId,
          total_ht: vente.totalHT,
          total_tva: vente.totalTVA,
          total_ttc: vente.totalTTC,
          timbre_amount: vente.timbreAmount || 0,
          montant_paye: vente.montantPaye || 0,
          status: vente.status,
          payment_mode: vente.paymentMode,
          notes: vente.notes,
          remise_active: vente.remiseActive,
          remise_pct: vente.remisePct,
          remise_montant: vente.remiseMontant,
        }).eq('id', vente.id);

        // Delete old lines and insert new ones
        await supabase.from('vente_lines').delete().eq('vente_id', vente.id);
        const updatedLines = vente.lines.map(l => ({
          vente_id: vente.id,
          product_id: l.productId || null,
          designation: l.designation,
          quantity: l.quantity,
          prix_unit_ht: l.prixUnitHT,
          tva: l.tva,
          nbre_colis: l.nbreColis || 0,
          colisage: l.colisage || 0,
        }));
        if (updatedLines.length > 0) {
          await supabase.from('vente_lines').insert(updatedLines);
        }
        await loadData();
      } else {
        // Create new vente
        const { data: newVente, error: insertErr } = await supabase.from('ventes').insert({
          numero: vente.numero,
          date: vente.date,
          client_id: vente.clientId,
          total_ht: vente.totalHT,
          total_tva: vente.totalTVA,
          total_ttc: vente.totalTTC,
          timbre_amount: vente.timbreAmount || 0,
          montant_paye: vente.montantPaye || 0,
          status: vente.status,
          payment_mode: vente.paymentMode,
          notes: vente.notes,
          remise_active: vente.remiseActive,
          remise_pct: vente.remisePct,
          remise_montant: vente.remiseMontant,
        }).select().single();
        if (insertErr) throw insertErr;

        if (newVente) {
          // Insert vente lines + update stock (reduce quantity sold)
          const lines = vente.lines.map(l => ({
            vente_id: newVente.id,
            product_id: l.productId || null,
            designation: l.designation,
            quantity: l.quantity,
            prix_unit_ht: l.prixUnitHT,
            tva: l.tva,
            nbre_colis: l.nbreColis || 0,
            colisage: l.colisage || 0,
          }));
          if (lines.length > 0) {
            const { error: linesErr } = await supabase.from('vente_lines').insert(lines);
            if (linesErr) throw linesErr;
          }

          // ── Create client debt if unpaid balance exists ──
          if (resteAPayer > 0 && vente.clientId) {
            await supabase.from('client_debts').insert({
              client_id: vente.clientId,
              vente_id: newVente.id,
              total_amount: vente.totalTTC,
              paid_amount: vente.montantPaye || 0,
              date: vente.date,
              invoice_number: vente.numero,
              description: `Vente ${vente.numero} - Reste à payer`,
            });
          }
        }
      }
      await loadData();
    } catch (err) {
      console.error('Error saving vente:', err);
      alert('Erreur lors de l\'enregistrement: ' + (err as any)?.message);
    }
    setShowForm(false);
    setEditingVente(undefined);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
      try {
        // Delete child rows first (foreign key order matters)
        await supabase.from('client_debts').delete().eq('vente_id', id);
        await supabase.from('vente_lines').delete().eq('vente_id', id);
        const { error } = await supabase.from('ventes').delete().eq('id', id);
        if (error) throw error;
        setVentes(prev => prev.filter(v => v.id !== id));
        setViewingVente(undefined);
      } catch (err: any) {
        console.error('Error deleting vente:', err);
        alert('Erreur lors de la suppression: ' + (err?.message || 'Erreur inconnue'));
      }
    }
  };

  const totalTTC = ventes.reduce((s, v) => s + v.totalTTC, 0);
  const confirmed = ventes.filter(v => v.status === 'confirme').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
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
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Ventes
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gestion complète des factures de vente et encaissements</p>
        </div>
        {hasPermission('action_create') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingVente(undefined); setShowForm(true); }}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/40 transition-all w-full md:w-auto"
          >
            <Plus size={20} />
            Nouvelle Vente
          </motion.button>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl hover:shadow-indigo-500/40 transition-all col-span-2"
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
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Total Factures</p>
                <p className="text-lg font-black">{ventes.length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Confirmées</p>
                <p className="text-lg font-black">{confirmed}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl p-6 border border-indigo-100/50 shadow-xl"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition par statut</h3>
          <div className="space-y-3">
            {Object.entries(STATUS_MAP).map(([key, val]) => {
              const count = ventes.filter(v => v.status === key).length;
              const pct = ventes.length ? Math.round(count / ventes.length * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                    <span>{val.label}</span><span>{count}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 rounded-full"
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
        className="bg-gradient-to-br from-white to-indigo-50/20 rounded-3xl border border-indigo-100/50 shadow-xl overflow-hidden"
      >
        {/* Table Header */}
        <div className="p-6 md:p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-900">Liste des Ventes</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par N° ou client..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none shadow-sm"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(PAYMENT_STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingCart className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold mb-2">
              {ventes.length === 0 ? 'Aucune vente créée' : 'Aucun résultat trouvé'}
            </p>
            {ventes.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
              >
                Créer la première vente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-b border-indigo-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">N° Facture</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Articles</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Timbre</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Montant TTC</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100/50">
                {filtered.map(vente => (
                  <motion.tr
                    key={vente.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-indigo-50/50 transition-all"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{vente.numero}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{clients.find(c => c.id === vente.clientId)?.name || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                        {vente.lines.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {vente.timbreAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
                          <Check size={10} /> {fmt(vente.timbreAmount)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-700">
                      <div className="flex flex-col items-end">
                        <span>{fmt(vente.totalTTC - (vente.remiseMontant || 0) + (vente.timbreAmount || 0))}</span>
                        {vente.remiseActive && (
                          <span className="text-[10px] text-rose-500 font-bold">Remise -{vente.remisePct}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const paymentStatus = getVentePaymentStatus(vente);
                        const statusInfo = PAYMENT_STATUS_MAP[paymentStatus];
                        const reste = Math.max(0, vente.totalTTC - (vente.montantPaye || 0));
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {reste > 0 && (
                              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                                Reste: {fmt(reste)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {new Date(vente.date).toLocaleDateString('fr-DZ')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewingVente(vente)}
                          className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </motion.button>
                        {hasPermission('action_edit') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setEditingVente(vente); setShowForm(true); }}
                            className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-all"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </motion.button>
                        )}
                        {hasPermission('action_pay_debts') && getVentePaymentStatus(vente) === 'dette' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPayingVente(vente)}
                            className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all"
                            title="Payer la dette"
                          >
                            <CreditCard size={16} />
                          </motion.button>
                        )}
                        {hasPermission('action_print') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => printVente(vente, clients.find(c => c.id === vente.clientId), settings)}
                            className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                            title="Imprimer"
                          >
                            <Printer size={16} />
                          </motion.button>
                        )}
                        {hasPermission('action_delete') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(vente.id)}
                            className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        )}
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
          <VenteForm
            vente={editingVente}
            clients={clients}
            products={products}
            timbres={timbres}
            generateNumero={generateNumero}
            onClose={() => { setShowForm(false); setEditingVente(undefined); }}
            onSave={handleSave}
          />
        )}
        {viewingVente && (
          <ViewModal
            vente={viewingVente}
            clients={clients}
            onClose={() => setViewingVente(undefined)}
            settings={settings}
          />
        )}
        {payingVente && (
          <VentePayDebtModal
            vente={payingVente}
            client={clients.find(c => c.id === payingVente.clientId)}
            onClose={() => setPayingVente(undefined)}
            onPaid={() => {
              setPayingVente(undefined);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
