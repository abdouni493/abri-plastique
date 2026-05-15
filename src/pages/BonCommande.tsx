/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, Printer, Eye, X, FileText,
  ChevronDown, Package, User, Building2, Check, AlertCircle, ShoppingCart, ArrowRight, Loader, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

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
  address?: string;
  activite?: string;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  article?: string;
  wilaya?: string;
  address?: string;
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

interface BonCommande {
  id: string;
  numero: string;
  date: string;
  datelivraison: string;
  supplier: Supplier | null;
  client: Client | null;
  lines: BonLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  status: 'brouillon' | 'confirme' | 'livre' | 'annule';
  notes: string;
  paymentMode: 'especes' | 'virement' | 'cheque' | 'traite';
  sourceType?: 'commande' | 'proformat'; // Track which source type was used
  proformatId?: string; // Reference to proformat if converted from proformat
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'decimal', minimumFractionDigits: 2 }).format(n) + ' DA';

const genId = () => Math.random().toString(36).substr(2, 9);

// Generates a temporary local number — real number is from document_sequences
const genTempNumero = (prefix: string) =>
  `${prefix}-${new Date().getFullYear()}-XXXX`;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirme:  { label: 'Confirmé',  color: 'text-blue-700',  bg: 'bg-blue-100'  },
  livre:     { label: 'Livré',     color: 'text-emerald-700',bg: 'bg-emerald-100'},
  annule:    { label: 'Annulé',    color: 'text-red-700',   bg: 'bg-red-100'   },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductSearch({ products, onSelect, placeholder = 'Rechercher un produit...' }: {
  products: Product[];
  onSelect: (p: Product) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.designation}</p>
                  <p className="text-xs text-gray-400 font-semibold">{p.refProduct} · Stock: {p.currentQuantity} {p.uniteMesure}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-indigo-600">{formatAmount(p.prixVente)}</p>
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
  entities: (Supplier | Client)[];
  onSelect: (e: any) => void;
  placeholder: string;
  icon: React.ElementType;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
            {results.map((e: any) => (
              <button
                key={e.id}
                onClick={() => { onSelect(e); setQuery(e.name); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{e.name}</p>
                  <p className="text-xs text-gray-400 font-semibold">{e.phone} · {e.wilaya}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Print Template ───────────────────────────────────────────────────────────

function printBon(bon: BonCommande, title: string, subtitle: string, settings?: any) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) return;

  const entitySection = bon.supplier
    ? `<div class="party-box"><div class="party-label">FOURNISSEUR</div><div class="party-name">${bon.supplier.name}</div><div class="party-detail">${bon.supplier.phone || ''}</div><div class="party-detail">NIF: ${bon.supplier.nif || 'N/A'}</div><div class="party-detail">${bon.supplier.wilaya || ''}</div></div>`
    : bon.client
    ? `<div class="party-box"><div class="party-label">CLIENT</div><div class="party-name">${bon.client.name}</div><div class="party-detail">${bon.client.phone || ''}</div><div class="party-detail">NIF: ${bon.client.taxId || 'N/A'}</div><div class="party-detail">${bon.client.wilaya || ''}</div></div>`
    : '';

  const lines = bon.lines.map((l, i) => `
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

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - ${bon.numero}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Inter', sans-serif; font-size: 12px; color: #1a1a2e; padding: 20px; background: #fff; line-height: 1.5; }
        .receipt-container { max-width: 900px; margin: 0 auto; background: #fff; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px; gap: 15px; }
        .company-logo { width: 60px; height: 60px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2); flex-shrink: 0; overflow: hidden; }
        .company-logo img { width: 100%; height: 100%; object-fit: contain; }
        .company-info { flex: 1; }
        .company-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
        .company-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #666; }
        .company-details div { display: flex; flex-direction: column; gap: 1px; }
        .company-details label { font-weight: 600; text-transform: uppercase; font-size: 8px; color: #999; letter-spacing: 0.3px; }
        .company-details span { font-weight: 500; color: #333; font-size: 10px; }
        .doc-title { text-align: right; }
        .doc-type { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #1a1a2e; }
        .doc-num { font-size: 13px; font-weight: 700; color: #4f46e5; margin-top: 4px; }
        .doc-date { font-size: 11px; color: #666; font-weight: 600; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 15px; }
        .party-box { flex: 1; background: #f5f3ff; border-radius: 8px; padding: 14px; border-left: 4px solid #4f46e5; }
        .party-label { font-size: 9px; font-weight: 900; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .party-name { font-size: 13px; font-weight: 800; color: #1a1a2e; margin-bottom: 4px; }
        .party-detail { font-size: 10px; color: #555; margin-bottom: 2px; }
        .info-box { flex: 1; background: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e2e8f0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
        .info-label { color: #888; font-weight: 600; }
        .info-val { font-weight: 800; color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        thead tr { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; }
        th { padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        th.center, td.center { text-align: center; }
        th.right, td.right { text-align: right; }
        tbody tr { border-bottom: 1px solid #f0f0f0; }
        tbody tr:nth-child(even) { background: #fafafa; }
        td { padding: 9px 8px; }
        td small { color: #888; font-size: 9px; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
        .totals-box { background: #f5f3ff; border-radius: 10px; padding: 16px 24px; min-width: 280px; border-left: 4px solid #4f46e5; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
        .total-row.big { font-size: 16px; font-weight: 900; color: #4f46e5; border-top: 2px solid #4f46e5; padding-top: 8px; margin-top: 4px; }
        .notes { background: #fffbeb; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 11px; border-left: 4px solid #f59e0b; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig { text-align: center; width: 30%; }
        .sig-line { border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; font-weight: 700; color: #888; margin-top: 50px; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #dbeafe; color: #1d4ed8; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="company-logo">
            ${settings?.logo ? `<img src="${settings.logo}">` : 'BC'}
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
          <div class="doc-title">
            <div class="doc-type">${subtitle}</div>
            <div class="doc-num">${bon.numero}</div>
            <div class="doc-date">Date: ${bon.date}${bon.datelivraison ? ' · Livraison: ' + bon.datelivraison : ''}</div>
            <div style="margin-top:6px"><span class="status-badge">${STATUS_MAP[bon.status]?.label}</span></div>
          </div>
        </div>

      <div class="meta">
        ${entitySection}
        <div class="info-box">
          <div class="info-row"><span class="info-label">N° Document:</span><span class="info-val">${bon.numero}</span></div>
          <div class="info-row"><span class="info-label">Date:</span><span class="info-val">${bon.date}</span></div>
          ${bon.datelivraison ? `<div class="info-row"><span class="info-label">Date Livraison:</span><span class="info-val">${bon.datelivraison}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Mode Paiement:</span><span class="info-val">${bon.paymentMode}</span></div>
          <div class="info-row"><span class="info-label">Articles:</span><span class="info-val">${bon.lines.length}</span></div>
        </div>
      </div>

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
          <div class="total-row"><span>Total HT:</span><span>${new Intl.NumberFormat('fr-DZ').format(bon.totalHT)} DA</span></div>
          <div class="total-row"><span>Total TVA:</span><span>${new Intl.NumberFormat('fr-DZ').format(bon.totalTVA)} DA</span></div>
          <div class="total-row big"><span>TOTAL TTC:</span><span>${new Intl.NumberFormat('fr-DZ').format(bon.totalTTC)} DA</span></div>
        </div>
      </div>

      ${bon.notes ? `<div class="notes"><strong>Remarques:</strong> ${bon.notes}</div>` : ''}

      <div class="signatures">
        <div class="sig"><div class="sig-line">Responsable Achat</div></div>
        <div class="sig"><div class="sig-line">Cachet Entreprise</div></div>
        <div class="sig"><div class="sig-line">Fournisseur / Client</div></div>
      </div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
  win.onafterprint = () => {
    document.body.removeChild(iframe);
    window.location.reload();
  };
  win.focus();
  win.print();
}

// Print Bon de Livraison as Non-Comptabilisée Invoice
// Print Bon de Livraison as Non-Comptabilisée Invoice
function handlePrintFactureNC(bl: BonCommande) {
  // Fetch company settings from Supabase
  supabase.from('company_settings').select('*').maybeSingle().then(({ data: settings }) => {
    // Format client info
    const clientSection = bl.client ? `
      <div class="party-box">
        <label>CLIENT</label>
        <div class="value" style="font-size: 13px; font-weight: 800; color: #1a1a2e;">${bl.client.name || 'N/A'}</div>
        ${bl.client.address ? `<div class="value" style="font-size:10px;color:#555;margin-top:3px;">${bl.client.address}</div>` : ''}
        ${bl.client.phone ? `<div class="value" style="font-size:10px;color:#555;margin-top:1px;">Tél: ${bl.client.phone}</div>` : ''}
        ${bl.client.taxId ? `<div class="value" style="font-size:10px;color:#555;margin-top:1px;">NIF: ${bl.client.taxId}</div>` : ''}
        ${bl.client.wilaya ? `<div class="value" style="font-size:10px;color:#555;margin-top:1px;">${bl.client.wilaya}${bl.client.commune ? ' - ' + bl.client.commune : ''}</div>` : ''}
      </div>
    ` : '';

    // Format lines
    const lines = bl.lines.map((l: BonLine, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td><strong>${l.product?.designation || 'N/A'}</strong></td>
        <td class="center">${l.quantity || 0}</td>
        <td class="right">${new Intl.NumberFormat('fr-DZ').format(l.prixUnitHT || 0)}</td>
        <td class="center">${l.tva || 19}%</td>
        <td class="right"><strong>${new Intl.NumberFormat('fr-DZ').format(l.totalHT || 0)}</strong></td>
        <td class="right"><strong>${new Intl.NumberFormat('fr-DZ').format(l.totalTTC || 0)}</strong></td>
      </tr>
    `).join('');

    const htmlTemplate = `
      <!DOCTYPE html>
      <html dir="ltr" lang="fr">
      <head>
        <meta charset="utf-8">
        <title>FACTURE NON COMPTABILISÉE - ${bl.numero}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;900&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          @page { size: A4; margin: 10mm; }
          
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
          
          body { font-family: 'Inter', sans-serif; font-size: 12px; background: #fff; color: #1a1a1a; line-height: 1.5; }
          
          .receipt-container { max-width: 900px; margin: 0 auto; background: #fff; padding: 18px; position: relative; }
          
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; font-weight: 900; color: rgba(220, 38, 38, 0.1); opacity: 0.3; pointer-events: none; z-index: 0; white-space: nowrap; }
          
          .company-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 15px; gap: 15px; position: relative; z-index: 1; }
          .company-logo { width: 60px; height: 60px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2); flex-shrink: 0; overflow: hidden; }
          .company-logo img { width: 100%; height: 100%; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
          .company-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #666; }
          .company-details div { display: flex; flex-direction: column; gap: 1px; }
          .company-details label { font-weight: 600; text-transform: uppercase; font-size: 8px; color: #999; letter-spacing: 0.3px; }
          .company-details span { font-weight: 500; color: #333; font-size: 10px; }
          
          .document-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 8px; border-left: 3px solid #dc2626; position: relative; z-index: 1; }
          .document-title h1 { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 900; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; }
          .document-title p { font-size: 10px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
          .doc-ref { text-align: right; }
          .doc-ref .label { font-size: 8px; font-weight: 700; color: #999; }
          .doc-ref .value { font-size: 11px; font-weight: 700; color: #dc2626; }
          
          .parties-section { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; position: relative; z-index: 1; }
          .party-box { padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #fee2e2; border-left: 3px solid #dc2626; }
          .party-box label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #991b1b; }
          .party-box .value { font-size: 11px; font-weight: 600; color: #1a1a1a; margin-top: 3px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; position: relative; z-index: 1; }
          thead tr { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; }
          th { padding: 8px; text-align: left; font-weight: 700; }
          td { padding: 7px; border-bottom: 1px solid #f0f0f0; }
          .right { text-align: right; }
          .center { text-align: center; }
          
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 15px; position: relative; z-index: 1; }
          .totals-box { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #fff; padding: 12px 16px; min-width: 250px; border-radius: 8px; }
          .totals-box .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
          .totals-box .total-row { border-top: 1.5px solid rgba(255,255,255,0.3); padding-top: 8px; margin-top: 8px; font-weight: 900; font-size: 13px; }
          
          .notes-section { padding: 10px; background: #fee2e2; border-left: 3px solid #dc2626; border-radius: 6px; margin-bottom: 15px; font-size: 11px; position: relative; z-index: 1; }
          .notes-section label { font-weight: 700; }
          
          .non-comptabilisee-notice { background: #fca5a5; color: #7f1d1d; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; position: relative; z-index: 1; }
          
          .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 15px; padding-top: 12px; border-top: 1.5px solid #e5e7eb; position: relative; z-index: 1; }
          .signature-box { text-align: center; }
          .signature-space { min-height: 40px; border-bottom: 1.5px solid #1a1a1a; margin-bottom: 3px; }
          .signature-label { font-size: 8px; font-weight: 600; color: #666; text-transform: uppercase; }
          
          .footer-section { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 8px; color: #999; position: relative; z-index: 1; }
        </style>
      </head>
      <body>
        <div class="watermark">NON COMPTABILISÉE</div>
        <div class="receipt-container">
          <div class="company-header">
            <div class="company-logo">
              ${settings?.logo ? `<img src="${settings.logo}">` : 'NC'}
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
                ${settings?.activite ? `<div><label>Activité</label><span>${settings.activite}</span></div>` : ''}
              </div>
            </div>
          </div>
          
          <div class="non-comptabilisee-notice">⚠ FACTURE NON COMPTABILISÉE ⚠</div>
          
          <div class="document-header">
            <div class="document-title">
              <h1>Facture Non Comptabilisée</h1>
              <p>Document Provisoire</p>
            </div>
            <div class="doc-ref">
              <div class="label">Numéro:</div>
              <div class="value">${bl.numero}</div>
              <div class="label" style="margin-top: 4px;">Date:</div>
              <div class="value">${bl.date}</div>
            </div>
          </div>
          
          <div class="parties-section">
            <div class="party-box">
              <label>Fournisseur / Vendeur</label>
              <div class="value" style="font-weight: 700;">${settings?.name || 'ABRI PLASTIQUE'}</div>
              <div class="value" style="font-size: 9px; color: #666; margin-top: 2px;">${settings?.address || 'Alger, Algérie'}</div>
            </div>
            ${clientSection || '<div class="party-box"><label>Client</label><div class="value">Non spécifié</div></div>'}
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="center">#</th>
                <th>Désignation</th>
                <th class="center">Quantité</th>
                <th class="right">P.U HT</th>
                <th class="center">TVA</th>
                <th class="right">Total HT</th>
                <th class="right">Total TTC</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          
          <div class="totals-section">
            <div class="totals-box">
              <div class="row"><span>Total HT:</span><span>${new Intl.NumberFormat('fr-DZ').format(bl.totalHT || 0)} DA</span></div>
              <div class="row"><span>Total TVA:</span><span>${new Intl.NumberFormat('fr-DZ').format(bl.totalTVA || 0)} DA</span></div>
              <div class="row total-row"><span>TOTAL TTC:</span><span>${new Intl.NumberFormat('fr-DZ').format(bl.totalTTC || 0)} DA</span></div>
            </div>
          </div>
          
          ${bl.notes ? `<div class="notes-section"><label>Remarques:</label> ${bl.notes}</div>` : ''}
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-space"></div>
              <div class="signature-label">Responsable Livraison</div>
            </div>
            <div class="signature-box">
              <div class="signature-space"></div>
              <div class="signature-label">Cachet Entreprise</div>
            </div>
            <div class="signature-box">
              <div class="signature-space"></div>
              <div class="signature-label">Client</div>
            </div>
          </div>
          
          <div class="footer-section">Document imprimé le ${new Date().toLocaleDateString('fr-DZ')} - Facture Non Comptabilisée</div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.write(htmlTemplate);
    iframe.contentWindow?.document.close();
    
    iframe.contentWindow?.addEventListener('afterprint', () => {
      document.body.removeChild(iframe);
      window.location.reload();
    });
    
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  });
}

// ─── Source Bon Search Component ──────────────────────────────────────────────

function SourceBonSearch({ type, clients, suppliers, products, onSelect, placeholder }: {
  type: 'livraison' | 'reception';
  clients: Client[];
  suppliers: Supplier[];
  products: Product[];
  onSelect: (bon: BonCommande, sourceType: 'commande' | 'proformat') => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [allBons, setAllBons] = useState<BonCommande[]>([]);
  const [loadingBons, setLoadingBons] = useState(false);

  // For Livraison: allow choosing between Commande and Proformat
  // For Réception: only Commande
  const [sourceType, setSourceType] = useState<'commande' | 'proformat'>(
    type === 'livraison' ? 'proformat' : 'commande'
  );

  useEffect(() => {
    const loadSourceBons = async () => {
      setLoadingBons(true);
      try {
        let sourceTable = 'bons_commande';
        let linesTable = 'bon_commande_lines';
        let idField = 'bc_id';

        if (sourceType === 'proformat') {
          sourceTable = 'factures_proformat';
          linesTable = 'facture_proformat_lines';
          idField = 'fp_id';
        }

        const { data, error } = await supabase
          .from(sourceTable)
          .select(`*, ${linesTable}(*)`)
          .order('date', { ascending: false });

        if (error) throw error;

        // Map the data with resolved relations
        const mapped = (data || []).map((bon: any) => {
          const client = clients.find(c => c.id === bon.client_id) || null;
          const supplier = suppliers.find(s => s.id === bon.supplier_id) || null;

          return {
            id: bon.id,
            numero: bon.numero || '',
            date: bon.date || '',
            datelivraison: bon.date_livraison || '',
            supplier,
            client,
            lines: (bon[linesTable] || []).map((l: any) => ({
              id: l.id,
              product: products.find(p => p.id === l.product_id) || { id: l.product_id, designation: 'Inconnu', refProduct: '', barCode: '', prixAchatHT: 0, prixVente: 0, tva: 19, currentQuantity: 0, uniteMesure: 'Unité', famille: '' },
              quantity: l.quantity || 0,
              prixUnitHT: l.prix_unit_ht || 0,
              tva: l.tva || 19,
              totalHT: l.total_ht || 0,
              totalTTC: l.total_ttc || 0,
              nbreColis: l.nbre_colis || 0,
              colisage: l.colisage || 0,
            })),
            totalHT: bon.total_ht || 0,
            totalTVA: bon.total_tva || 0,
            totalTTC: bon.total_ttc || 0,
            status: bon.status || 'brouillon',
            notes: bon.notes || '',
            paymentMode: bon.payment_mode || 'virement',
          };
        });
        setAllBons(mapped);
      } catch (err) {
        console.error('Failed to load source bons:', err);
      }
      setLoadingBons(false);
    };
    loadSourceBons();
  }, [sourceType, clients, suppliers, products]);

  const results = allBons.filter(b =>
    b.numero.toLowerCase().includes(query.toLowerCase()) ||
    (b.client?.name || b.supplier?.name || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Show source type selector only for Livraison */}
      {type === 'livraison' && (
        <div className="mb-3 flex gap-3">
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sourceType"
              value="proformat"
              checked={sourceType === 'proformat'}
              onChange={() => setSourceType('proformat')}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-sm font-semibold text-gray-700">Depuis Facture Proformat</span>
          </label>
        </div>
      )}
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
            {results.map(b => (
              <button
                key={b.id}
                onClick={() => { onSelect(b, sourceType); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{b.numero}</p>
                  <p className="text-xs text-gray-400 font-semibold">{b.client?.name || b.supplier?.name} · {b.totalTTC > 0 ? formatAmount(b.totalTTC) : 'Vide'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-600">{b.lines.length} produits</p>
                  <p className="text-[10px] text-gray-400">{b.status}</p>
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

const BonForm: React.FC<{
  type: 'commande' | 'livraison' | 'reception' | 'proformat';
  bon?: BonCommande;
  conversionSource?: BonCommande;
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (b: BonCommande) => void;
}> = function({
  type, bon, conversionSource, products, clients, suppliers, onClose, onSave
}) {
  const isNew = !bon;
  const isConversion = !!conversionSource && !bon;
  const useClient = type === 'livraison' || type === 'proformat';
  const useSupplier = type === 'commande' || type === 'reception';
  const canSearchSource = (type === 'livraison' || type === 'reception') && isNew && !isConversion;

  const PREFIX_MAP = { commande: 'BC', livraison: 'BL', reception: 'BR', proformat: 'FP' };
  const TITLE_MAP = { commande: 'Bon de Commande', livraison: 'Bon de Livraison', reception: 'Bon de Réception', proformat: 'Facture Proformat' };

  // Initialize form with conversion data if available
  const getInitialForm = () => {
    if (bon) {
      return bon;
    }
    if (isConversion && conversionSource) {
      return {
        id: genId(),
        numero: genTempNumero(PREFIX_MAP[type]),
        date: new Date().toISOString().split('T')[0],
        datelivraison: conversionSource.datelivraison || '',
        supplier: type === 'reception' ? conversionSource.supplier : null,
        client: type === 'livraison' ? conversionSource.client : null,
        lines: conversionSource.lines,
        totalHT: conversionSource.totalHT,
        totalTVA: conversionSource.totalTVA,
        totalTTC: conversionSource.totalTTC,
        status: 'brouillon',
        notes: conversionSource.notes || '',
        paymentMode: conversionSource.paymentMode || 'virement',
      };
    }
    return {
      id: genId(),
      numero: genTempNumero(PREFIX_MAP[type]),
      date: new Date().toISOString().split('T')[0],
      datelivraison: '',
      supplier: null,
      client: null,
      lines: [],
      totalHT: 0,
      totalTVA: 0,
      totalTTC: 0,
      status: 'brouillon',
      notes: '',
      paymentMode: 'virement',
    };
  };

  const [form, setForm] = useState<BonCommande>(getInitialForm());

  const [supplierQuery, setSupplierQuery] = useState(bon?.supplier?.name || '');
  const [clientQuery, setClientQuery] = useState(bon?.client?.name || '');
  const [selectedSourceBon, setSelectedSourceBon] = useState<BonCommande | null>(null);

  // Handle source bon selection (auto-populate form)
  const handleSourceBonSelect = (sourceBon: BonCommande, srcType: 'commande' | 'proformat') => {
    setSelectedSourceBon(sourceBon);
    
    const newForm: BonCommande = {
      ...form,
      numero: genTempNumero(PREFIX_MAP[type]),
      date: new Date().toISOString().split('T')[0],
      datelivraison: sourceBon.datelivraison || '',
      lines: sourceBon.lines,
      client: type === 'livraison' ? sourceBon.client : form.client,
      supplier: type === 'reception' ? sourceBon.supplier : form.supplier,
      totalHT: sourceBon.totalHT,
      totalTVA: sourceBon.totalTVA,
      totalTTC: sourceBon.totalTTC,
      status: 'brouillon',
      notes: sourceBon.notes || '',
      paymentMode: sourceBon.paymentMode || 'virement',
      sourceType: srcType,
      proformatId: srcType === 'proformat' ? sourceBon.id : undefined,
    };
    
    setForm(newForm);
  };


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
      prixUnitHT: useClient ? p.prixVente : p.prixAchatHT,
      tva: p.tva,
      totalHT: useClient ? p.prixVente : p.prixAchatHT,
      totalTTC: (useClient ? p.prixVente : p.prixAchatHT) * (1 + p.tva / 100),
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
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-slate-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">
              {isConversion ? `Créer ${TITLE_MAP[type]} depuis ${conversionSource?.numero}` : `${isNew ? 'Nouveau' : 'Modifier'} ${TITLE_MAP[type]}`}
            </h2>
            <p className="text-indigo-200 text-sm font-semibold mt-0.5">{form.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 rounded-xl p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {/* Source Bon Search (for Livraison & Réception) */}
          {canSearchSource && !selectedSourceBon && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-2xl border-2 border-dashed border-emerald-300"
            >
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="text-emerald-600" size={18} />
                <label className="block text-sm font-bold text-emerald-900">Rechercher et convertir un document source</label>
              </div>
              <SourceBonSearch
                type={type as 'livraison' | 'reception'}
                clients={clients}
                suppliers={suppliers}
                products={products}
                onSelect={handleSourceBonSelect}
                placeholder="Rechercher un Bon de Commande..."
              />
              <p className="text-xs text-emerald-700 font-semibold mt-2">
                💡 Sélectionnez un Bon de Commande pour auto-remplir ce formulaire
              </p>
            </motion.div>
          )}

          {/* Source Bon Info Card */}
          {selectedSourceBon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl border border-emerald-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Check size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900">Converti depuis {selectedSourceBon.numero}</p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      {selectedSourceBon.lines.length} produits · {formatAmount(selectedSourceBon.totalTTC)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSourceBon(null)}
                  className="text-emerald-600 hover:text-red-500 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Document</label>
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
            {type === 'commande' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date Livraison</label>
                <input
                  type="date"
                  value={form.datelivraison}
                  onChange={e => setForm(f => ({ ...f, datelivraison: e.target.value }))}
                  className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Supplier / Client Search */}
            {useSupplier && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fournisseur</label>
                <EntitySearch
                  entities={suppliers}
                  onSelect={(s) => setForm(f => ({ ...f, supplier: s }))}
                  placeholder="Rechercher un fournisseur..."
                  icon={Building2}
                />
                {form.supplier && (
                  <div className="mt-2 px-3 py-2 bg-indigo-50 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-700">{form.supplier.name}</span>
                    <button onClick={() => setForm(f => ({ ...f, supplier: null }))} className="text-indigo-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {useClient && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
                <EntitySearch
                  entities={clients}
                  onSelect={(c) => setForm(f => ({ ...f, client: c }))}
                  placeholder="Rechercher un client..."
                  icon={User}
                />
                {form.client && (
                  <div className="mt-2 px-3 py-2 bg-indigo-50 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-700">{form.client.name}</span>
                    <button onClick={() => setForm(f => ({ ...f, client: null }))} className="text-indigo-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {(type === 'commande' || type === 'proformat') && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode de Paiement</label>
                <select
                  value={form.paymentMode}
                  onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value as any }))}
                  className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="especes">Espèces</option>
                  <option value="virement">Virement Bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="traite">Traite</option>
                </select>
              </div>
            )}
          </div>

          {/* Product Search & Lines */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ajouter des Produits</label>
            <ProductSearch products={products} onSelect={addProduct} placeholder="Rechercher par désignation, référence ou code barre..." />
          </div>

          {/* Lines Table */}
          {form.lines.length > 0 ? (
            <div className="bg-gradient-to-br from-indigo-50/30 to-purple-50/20 rounded-2xl border border-indigo-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-b border-indigo-100">
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
                          <input
                            type="number"
                            min="0"
                            value={line.prixUnitHT}
                            onChange={e => updateLine(line.id, 'prixUnitHT', Number(e.target.value))}
                            className="w-full text-right bg-white border border-indigo-200 rounded-lg py-1.5 px-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                          />
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
                        <td className="px-4 py-3 text-right font-black text-indigo-700">
                          {formatAmount(line.totalTTC)}
                        </td>
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

              {/* Totals */}
              <div className="flex justify-end p-4 border-t border-indigo-100">
                <div className="min-w-64 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total HT:</span>
                    <span>{formatAmount(form.totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total TVA:</span>
                    <span>{formatAmount(form.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-indigo-700 border-t border-indigo-200 pt-2">
                    <span>TOTAL TTC:</span>
                    <span>{formatAmount(form.totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 py-10 text-center bg-gradient-to-br from-indigo-50/50 to-purple-50/30 rounded-2xl border border-dashed border-indigo-200">
              <ShoppingCart className="mx-auto text-indigo-300 mb-3" size={32} />
              <p className="text-gray-400 font-semibold text-sm">Recherchez et sélectionnez des produits pour les ajouter</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarques / Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Conditions de livraison, remarques particulières..."
              className="w-full bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 flex items-center justify-between gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Annuler
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => { handleSave(); }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/40 hover:shadow-xl transition-all"
            >
              <Check size={16} />
              {isNew ? 'Créer le document' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal: React.FC<{ bon: BonCommande; onClose: () => void; type: string; onConvert?: () => void; settings?: any }> = function({ bon, onClose, type, onConvert, settings }) {
  const TITLE_MAP: Record<string, string> = { commande: 'Bon de Commande', livraison: 'Bon de Livraison', reception: 'Bon de Réception', proformat: 'Facture Proformat' };
  const SUBTITLE_MAP: Record<string, string> = { commande: 'BON DE COMMANDE', livraison: 'BON DE LIVRAISON', reception: 'BON DE RÉCEPTION', proformat: 'FACTURE PROFORMAT' };

  const st = STATUS_MAP[bon.status];
  const entity = bon.supplier || bon.client;

  const canConvert = type === 'commande' && bon.status === 'confirme';
  const canConvertBLToBR = type === 'livraison' && bon.status === 'confirme';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-slate-600 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">{TITLE_MAP[type]}</h2>
              <p className="text-indigo-200 font-bold text-lg mt-1">{bon.numero}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto">
          {/* Meta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Date</p>
              <p className="font-black text-gray-900">{bon.date}</p>
            </div>
            {bon.datelivraison && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Date Livraison</p>
                <p className="font-black text-gray-900">{bon.datelivraison}</p>
              </div>
            )}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Paiement</p>
              <p className="font-black text-gray-900 capitalize">{bon.paymentMode}</p>
            </div>
          </div>

          {/* Entity */}
          {entity && (
            <div className="mb-6 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 rounded-2xl p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-2">
                {bon.supplier ? 'Fournisseur' : 'Client'}
              </p>
              <p className="text-xl font-black">{entity.name}</p>
              <p className="text-indigo-200 text-sm mt-1">{entity.phone} · {entity.wilaya}</p>
            </div>
          )}

          {/* Lines Table */}
          <div className="bg-gradient-to-br from-indigo-50/30 to-purple-50/20 rounded-2xl border border-indigo-100 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-b border-indigo-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Désignation</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Qté</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">N° Colis</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Colisage</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">P.U HT</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">TVA</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100/50">
                {bon.lines.map((line, i) => (
                  <tr key={line.id} className="hover:bg-white/60">
                    <td className="px-4 py-3 text-gray-400 font-bold text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{line.product.designation}</p>
                      <p className="text-xs text-gray-400">{line.product.refProduct}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{line.quantity} {line.product.uniteMesure}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{line.nbreColis || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{line.colisage || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatAmount(line.prixUnitHT)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">{line.tva}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-indigo-700">{formatAmount(line.totalTTC)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl p-5 border border-indigo-100 min-w-64 space-y-2">
              <div className="flex justify-between text-sm font-semibold text-gray-600">
                <span>Total HT:</span><span>{formatAmount(bon.totalHT)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-600">
                <span>Total TVA:</span><span>{formatAmount(bon.totalTVA)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-indigo-700 border-t border-indigo-200 pt-2">
                <span>TOTAL TTC:</span><span>{formatAmount(bon.totalTTC)}</span>
              </div>
            </div>
          </div>

          {bon.notes && (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Remarques</p>
              <p className="text-sm text-gray-700">{bon.notes}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 flex justify-between">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            Fermer
          </button>
          <div className="flex gap-3">
            {(canConvert || canConvertBLToBR) && onConvert && (
              <button
                onClick={onConvert}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white font-bold text-sm shadow-lg hover:shadow-violet-500/40 hover:shadow-xl transition-all"
              >
                <ArrowRight size={16} />
                {type === 'commande' ? 'Convertir en BL' : 'Convertir en BR'}
              </button>
            )}
            {type === 'livraison' && (
              <button
                onClick={() => handlePrintFactureNC(bon)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 hover:shadow-xl transition-all"
              >
                <FileText size={16} />
                Facture NC
              </button>
            )}
            <button
              onClick={() => printBon(bon, TITLE_MAP[type], SUBTITLE_MAP[type], settings)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/40 hover:shadow-xl transition-all"
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

// ─── Main List Component ───────────────────────────────────────────────────────

interface CommercialDocListProps {
  type: 'commande' | 'livraison' | 'reception' | 'proformat';
}

const TITLE_MAP: Record<string, string> = {
  commande: 'Bons de Commande',
  livraison: 'Bons de Livraison',
  reception: 'Bons de Réception',
  proformat: 'Factures Proformat',
};

const SUBTITLE_MAP: Record<string, string> = {
  commande: 'Gestion des commandes fournisseurs',
  livraison: 'Gestion des livraisons clients',
  reception: 'Gestion des réceptions de marchandises',
  proformat: 'Gestion des factures proformat clients',
};

const ICON_MAP: Record<string, React.ElementType> = {
  commande: ShoppingCart,
  livraison: Package,
  reception: Package,
  proformat: FileText,
};

const COLOR_MAP: Record<string, string> = {
  commande: 'from-indigo-600 via-blue-600 to-slate-600',
  livraison: 'from-emerald-600 via-teal-600 to-cyan-700',
  reception: 'from-violet-600 via-purple-600 to-indigo-700',
  proformat: 'from-amber-500 via-orange-500 to-rose-600',
};

const SHADOW_MAP: Record<string, string> = {
  commande: 'hover:shadow-indigo-500/40',
  livraison: 'hover:shadow-emerald-500/40',
  reception: 'hover:shadow-violet-500/40',
  proformat: 'hover:shadow-amber-500/40',
};

function CommercialDocList({ type }: CommercialDocListProps) {
  const { hasPermission } = useAuth();
  const { settings } = useApp();
  const [bons, setBons] = useState<BonCommande[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBon, setEditingBon] = useState<BonCommande | undefined>();
  const [viewingBon, setViewingBon] = useState<BonCommande | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conversionSource, setConversionSource] = useState<BonCommande | undefined>();

  // ─── Generate document numero from sequences table ────────────────────────
  const getNextNumero = async (docType: string, prefix: string): Promise<string> => {
    const year = new Date().getFullYear();
    try {
      const { data } = await supabase
        .from('document_sequences')
        .select('*')
        .eq('doc_type', docType)
        .maybeSingle();
      if (data) {
        const newSeq = data.year === year ? (data.last_seq || 0) + 1 : 1;
        await supabase.from('document_sequences')
          .update({ last_seq: newSeq, year }).eq('doc_type', docType);
        return `${prefix}-${year}-${String(newSeq).padStart(4, '0')}`;
      } else {
        await supabase.from('document_sequences')
          .insert({ doc_type: docType, prefix, last_seq: 1, year });
        return `${prefix}-${year}-0001`;
      }
    } catch {
      return `${prefix}-${Date.now()}`;
    }
  };

  const PREFIX_MAP_SEQ: Record<string, { docType: string; prefix: string }> = {
    commande: { docType: 'commande', prefix: 'BC' },
    livraison: { docType: 'livraison', prefix: 'BL' },
    reception: { docType: 'reception', prefix: 'BR' },
    proformat: { docType: 'proformat', prefix: 'FP' },
  };

  const PREFIX_MAP: Record<string, string> = { commande: 'BC', livraison: 'BL', reception: 'BR', proformat: 'FP' };
  const Icon = ICON_MAP[type];
  const gradient = COLOR_MAP[type];
  const shadow = SHADOW_MAP[type];

  // ─── Supabase Table Mappings ────────────────────────────────────────────────
  const TABLE_MAP = {
    commande: 'bons_commande',
    livraison: 'bons_livraison',
    reception: 'bons_reception',
    proformat: 'factures_proformat',
  };

  const LINES_TABLE_MAP = {
    commande: 'bon_commande_lines',
    livraison: 'bon_livraison_lines',
    reception: 'bon_reception_lines',
    proformat: 'facture_proformat_lines',
  };

  const LINES_FK_MAP = {
    commande: 'bc_id',
    livraison: 'bl_id',
    reception: 'br_id',
    proformat: 'fp_id',
  };

  // ─── Map Functions ──────────────────────────────────────────────────────────

  const mapProduct = (p: any): Product => ({
    id: p.id,
    designation: p.designation || '',
    refProduct: p.ref_product || '',
    barCode: p.bar_code || '',
    prixAchatHT: p.prix_achat_ht || 0,
    prixVente: p.prix_vente || 0,
    tva: p.tva || 19,
    currentQuantity: p.current_quantity || 0,
    uniteMesure: p.unite_mesure || 'Unité',
    famille: p.famille || '',
  });

  const mapClient = (c: any): Client => ({
    id: c.id,
    name: c.name || '',
    phone: c.phone || undefined,
    taxId: c.tax_id || undefined,
    wilaya: c.wilaya || undefined,
    commune: c.commune || undefined,
  });

  const mapSupplier = (s: any): Supplier => ({
    id: s.id,
    name: s.name || '',
    phone: s.phone || undefined,
    nif: s.nif || undefined,
    wilaya: s.wilaya || undefined,
  });

  const mapBonLine = (l: any, productMap: Map<string, Product>): BonLine => ({
    id: l.id,
    product: productMap.get(l.product_id) || { id: l.product_id, designation: 'Unknown', refProduct: '', barCode: '', prixAchatHT: 0, prixVente: 0, tva: 19, currentQuantity: 0, uniteMesure: 'Unité', famille: '' },
    quantity: l.quantity_recv || l.quantity || 0,
    prixUnitHT: l.prix_unit_ht || 0,
    tva: l.tva || 19,
    totalHT: l.total_ht || 0,
    totalTTC: l.total_ttc || 0,
    nbreColis: l.nbre_colis || 0,
    colisage: l.colisage || 0,
  });

  const mapBon = (b: any, lines: BonLine[], clientMap?: Map<string, Client>, supplierMap?: Map<string, Supplier>): BonCommande => ({
    id: b.id,
    numero: b.numero || '',
    date: b.date || '',
    datelivraison: b.date_livraison || '',
    supplier: b.supplier_id && supplierMap ? supplierMap.get(b.supplier_id) || null : null,
    client: b.client_id && clientMap ? clientMap.get(b.client_id) || null : null,
    lines,
    totalHT: b.total_ht || 0,
    totalTVA: b.total_tva || 0,
    totalTTC: b.total_ttc || 0,
    status: b.status || 'brouillon',
    notes: b.notes || '',
    paymentMode: b.payment_mode || 'virement',
  });

  // ─── Load Data from Supabase ────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const table = TABLE_MAP[type as keyof typeof TABLE_MAP];
      const linesTable = LINES_TABLE_MAP[type as keyof typeof LINES_TABLE_MAP];

      const [bonsRes, productsRes, clientsRes, suppliersRes] = await Promise.all([
        supabase
          .from(table)
          .select(`*, ${linesTable}(*)`)
          .order('date', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('suppliers').select('*'),
      ]);

      if (bonsRes.error) throw bonsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      // Map products
      const mappedProducts = (productsRes.data || []).map(mapProduct);
      setProducts(mappedProducts);
      const productMap = new Map(mappedProducts.map(p => [p.id, p]));

      // Map clients & suppliers
      const mappedClients = (clientsRes.data || []).map(mapClient);
      setClients(mappedClients);
      const clientMap = new Map(mappedClients.map(c => [c.id, c]));

      const mappedSuppliers = (suppliersRes.data || []).map(mapSupplier);
      setSuppliers(mappedSuppliers);
      const supplierMap = new Map(mappedSuppliers.map(s => [s.id, s]));

      // Map bons with lines
      const mappedBons = (bonsRes.data || []).map(bon => {
        const bonLines = (bon[linesTable] || []).map((line: any) => mapBonLine(line, productMap));
        return mapBon(bon, bonLines, clientMap, supplierMap);
      });
      setBons(mappedBons);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [type]);

  const filtered = bons.filter(b => {
    const matchSearch = b.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.supplier?.name || b.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (bon: BonCommande) => {
    try {
      const table = TABLE_MAP[type as keyof typeof TABLE_MAP];
      const linesTable = LINES_TABLE_MAP[type as keyof typeof LINES_TABLE_MAP];
      const fkColumn = LINES_FK_MAP[type as keyof typeof LINES_FK_MAP];

      // Get the existing bon to check status change
      const existingBon = bons.find(b => b.id === bon.id);
      const statusChanged = existingBon && existingBon.status !== bon.status;
      const isConfirming = statusChanged && bon.status === 'confirme';

    // Determine if new: UUIDs from DB are 36 chars; genId() gives 9-char IDs
      const isNewBon = bon.id.length < 20; // genId produces 9 chars, UUID is 36

      // Assign a real numero from document_sequences when creating new
      let finalNumero = bon.numero;
      if (isNewBon) {
        const { docType, prefix } = PREFIX_MAP_SEQ[type as keyof typeof PREFIX_MAP_SEQ];
        finalNumero = await getNextNumero(docType, prefix);
      }

      // Prepare base bon data
      const bonData: any = {
        numero: finalNumero,
        date: bon.date,
        total_ht: bon.totalHT,
        total_tva: bon.totalTVA,
        total_ttc: bon.totalTTC,
        status: bon.status,
        notes: bon.notes,
      };

      if (type === 'commande') {
        bonData.date_livraison = bon.datelivraison || null;
        bonData.supplier_id = bon.supplier?.id || null;
        bonData.client_id = bon.client?.id || null;
        bonData.payment_mode = bon.paymentMode;
      } else if (type === 'livraison') {
        bonData.client_id = bon.client?.id || null;
        // Add proformat_id if this BL was converted from a proformat
        if (bon.proformatId) {
          bonData.proformat_id = bon.proformatId;
        }
      } else if (type === 'reception') {
        bonData.supplier_id = bon.supplier?.id || null;
      } else if (type === 'proformat') {
        bonData.client_id = bon.client?.id || null;
        bonData.payment_mode = bon.paymentMode;
      }

      let savedBon: any;
      if (isNewBon) {
        // New bon - insert
        const { data, error } = await supabase
          .from(table)
          .insert([bonData])
          .select()
          .single();
        if (error) throw error;
        savedBon = data;
      } else {
        // Existing bon - update
        const { data, error } = await supabase
          .from(table)
          .update(bonData)
          .eq('id', bon.id)
          .select()
          .single();
        if (error) throw error;
        savedBon = data;

        // Delete old lines
        await supabase
          .from(linesTable)
          .delete()
          .eq(fkColumn, bon.id);
      }

      // Insert lines
      const linesToInsert = bon.lines.map(line => {
        const lineData: any = {
          [fkColumn]: savedBon.id,
          product_id: line.product.id,
          designation: line.product.designation || 'Article',
          prix_unit_ht: line.prixUnitHT,
          tva: line.tva,
          nbre_colis: line.nbreColis || 0,
          colisage: line.colisage || 0,
        };
        
        // Use quantity_recv for reception, quantity for others
        if (type === 'reception') {
          lineData.quantity_recv = line.quantity;
        } else {
          lineData.quantity = line.quantity;
        }
        
        return lineData;
      });

      if (linesToInsert.length > 0) {
        const { error: linesError } = await supabase
          .from(linesTable)
          .insert(linesToInsert);
        if (linesError) throw linesError;
      }

      // Handle stock movements when confirming
      if (isConfirming) {
        for (const line of bon.lines) {
          if (!line.product?.id) continue;

          const { data: product } = await supabase
            .from('products')
            .select('current_quantity')
            .eq('id', line.product.id)
            .single();

          if (product) {
            // Determine quantity change based on document type
            let quantityChange = 0;
            if (type === 'commande') {
              quantityChange = -line.quantity; // Bon de Commande: deduct stock
            } else if (type === 'reception') {
              quantityChange = line.quantity; // Bon de Réception: add stock
            } else if (type === 'livraison') {
              quantityChange = -line.quantity; // Bon de Livraison: deduct stock
            }

            const newQty = product.current_quantity + quantityChange;
            await supabase
              .from('products')
              .update({ current_quantity: newQty })
              .eq('id', line.product.id);

            // Record stock movement
            await supabase.from('stock_movements').insert({
              product_id: line.product.id,
              quantity_before: product.current_quantity,
              quantity_change: quantityChange,
              quantity_after: newQty,
              reason: `${TITLE_MAP[type]} ${bon.numero}`,
              reference_type: table,
              reference_id: bon.id,
            });
          }
        }
      }

      // Reload data
      await loadData();
      setBons(prev => {
        const exists = prev.find(b => b.id === savedBon.id);
        if (exists) {
          return prev.map(b => b.id === savedBon.id ? { ...b, id: savedBon.id } : b);
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to save bon:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const table = TABLE_MAP[type as keyof typeof TABLE_MAP];
      const linesTable = LINES_TABLE_MAP[type as keyof typeof LINES_TABLE_MAP];
      const fkColumn = LINES_FK_MAP[type as keyof typeof LINES_FK_MAP];

      // Delete lines first
      await supabase
        .from(linesTable)
        .delete()
        .eq(fkColumn, id);

      // Delete bon
      await supabase
        .from(table)
        .delete()
        .eq('id', id);

      // Reload data
      await loadData();
    } catch (err) {
      console.error('Failed to delete bon:', err);
    }
  };

  const handleConvert = (bon: BonCommande) => {
    if (type === 'commande') {
      // Convert BC to BL
      setConversionSource(bon);
      setEditingBon(undefined);
      setShowForm(true);
    } else if (type === 'livraison') {
      // Convert BL to BR
      setConversionSource(bon);
      setEditingBon(undefined);
      setShowForm(true);
    }
  };

  const totalTTC = bons.reduce((s, b) => s + b.totalTTC, 0);
  const confirmed = bons.filter(b => b.status === 'confirme').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="flex items-center justify-center"
        >
          <Loader className="text-indigo-600" size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className={`text-4xl font-extrabold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {TITLE_MAP[type]}
          </h1>
          <p className="text-gray-600 font-semibold mt-1">{SUBTITLE_MAP[type]}</p>
        </div>
        {hasPermission('action_create') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingBon(undefined); setConversionSource(undefined); setShowForm(true); }}
            className={`flex items-center justify-center gap-2 bg-gradient-to-br ${gradient} text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl ${shadow} transition-all w-full md:w-auto`}
          >
            <Plus size={20} />
            Nouveau {type === 'proformat' ? 'Facture' : 'Bon'}
          </motion.button>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl ${shadow} transition-all`}
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
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Total Documents</p>
                <p className="text-lg font-black">{bons.length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                <p className="text-[10px] font-bold opacity-75 uppercase mb-1">Confirmés</p>
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
        className="bg-gradient-to-br from-white to-indigo-50/20 rounded-3xl border border-indigo-100/50 shadow-xl overflow-hidden"
      >
        {/* Table Header */}
        <div className="p-6 md:p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-900">Liste des {TITLE_MAP[type]}</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par N° ou nom..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/30 to-purple-50/30 border-b border-indigo-100/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">N° Document</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">
                  {type === 'commande' || type === 'reception' ? 'Fournisseur' : 'Client'}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">Articles</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">Total TTC</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100/30">
              {filtered.map(bon => {
                const st = STATUS_MAP[bon.status];
                const entity = bon.supplier || bon.client;
                return (
                  <tr key={bon.id} className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-black text-gray-900 font-mono">{bon.numero}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-600 font-mono">{bon.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      {entity ? (
                        <div>
                          <p className="text-sm font-bold text-gray-900">{entity.name}</p>
                          <p className="text-xs text-gray-400">{entity.phone}</p>
                        </div>
                      ) : <span className="text-gray-300 text-sm italic">Non assigné</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {bon.lines.length} article{bon.lines.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-extrabold text-sm text-indigo-700">{formatAmount(bon.totalTTC)}</span>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingBon(bon)}
                          className="action-btn-info"
                          title="Voir les détails"
                        >
                          <Eye size={18} />
                        </button>
                        {hasPermission('action_edit') && (
                          <button
                            onClick={() => { setEditingBon(bon); setConversionSource(undefined); setShowForm(true); }}
                            className="action-btn-edit"
                            title="Modifier"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {hasPermission('action_delete') && (
                          <button
                            onClick={() => handleDelete(bon.id)}
                            className="action-btn-delete"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {hasPermission('action_print') && (
                          <button
                            onClick={() => printBon(bon, TITLE_MAP[type], TITLE_MAP[type].toUpperCase(), settings)}
                            className="action-btn-print"
                            title="Imprimer"
                          >
                            <Printer size={18} />
                          </button>
                        )}
                        {type === 'livraison' && (
                          <button
                            onClick={() => handlePrintFactureNC(bon)}
                            className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all border border-orange-200 shadow-sm"
                            title="Imprimer Facture Non Comptabilisée"
                          >
                            <Receipt size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p-16 text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} mx-auto mb-4 flex items-center justify-center opacity-30`}>
                <Icon size={28} className="text-white" />
              </div>
              <p className="text-gray-400 font-semibold italic text-lg">
                {bons.length === 0 ? `Aucun ${type === 'proformat' ? 'facture' : 'bon'} créé` : 'Aucun résultat trouvé'}
              </p>
              {bons.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingBon(undefined); setConversionSource(undefined); setShowForm(true); }}
                  className={`mt-4 inline-flex items-center gap-2 bg-gradient-to-br ${gradient} text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl ${shadow} transition-all`}
                >
                  <Plus size={16} />
                  Créer le premier document
                </motion.button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <BonForm
            key="bon-form"
            type={type}
            bon={editingBon}
            conversionSource={conversionSource}
            products={products}
            clients={clients}
            suppliers={suppliers}
            onClose={() => { setShowForm(false); setEditingBon(undefined); setConversionSource(undefined); }}
            onSave={handleSave}
          />
        )}
        {viewingBon && (
          <ViewModal
            key="bon-view"
            bon={viewingBon}
            type={type}
            onClose={() => setViewingBon(undefined)}
            onConvert={() => { handleConvert(viewingBon); setViewingBon(undefined); }}
            settings={settings}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Exported Pages ───────────────────────────────────────────────────────────

export const BonCommande = () => <CommercialDocList type="commande" />;
export const BonLivraison = () => <CommercialDocList type="livraison" />;
export const BonReception = () => <CommercialDocList type="reception" />;
export const FactureProformat = () => <CommercialDocList type="proformat" />;

export default BonCommande;