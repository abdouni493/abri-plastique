/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Inventaire — Full Professional Interface
 * Features:
 *  - Create new inventaire session with multi-product entry
 *  - Status: en_cours → valide → annule
 *  - Actions: view details, edit, delete, print, compare with current stock
 *  - Compare modal shows full difference analysis (surplus, manque, conforme)
 *  - Same design system as Caisse / Banque / BonCommande / BonLivraison
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Printer, Eye, X,
  Package, Check, ClipboardList, GitCompare,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, BarChart3, Calendar, User, MapPin,
  ChevronDown, ChevronUp, Filter, Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StorageProduct {
  id: string;
  designation: string;
  refProduct: string;
  barCode: string;
  famille: string;
  uniteMesure: string;
  localisation: string;
  currentQuantity: number;
  prixAchatHT: number;
  prixVente: number;
}

interface InventaireLine {
  id: string;
  product: StorageProduct;
  quantiteComptee: number;
  observation?: string;
}

interface Inventaire {
  id: string;
  numero: string;
  date: string;
  responsable: string;
  lieu: string;
  status: 'en_cours' | 'valide' | 'annule';
  lines: InventaireLine[];
  notes: string;
  totalArticles: number;
  totalValeur: number;
}

interface DiffLine {
  product: StorageProduct;
  quantiteSysteme: number;
  quantiteComptee: number;
  ecart: number;
  ecartValeur: number;
  statut: 'surplus' | 'manque' | 'conforme';
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA';

const fmtNum = (n: number) =>
  new Intl.NumberFormat('fr-DZ').format(n);

const genId = () => Math.random().toString(36).substr(2, 9);
const genNum = () => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  en_cours: { label: 'En Cours',  color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-400',   icon: ClipboardList },
  valide:   { label: 'Validé',    color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-400', icon: CheckCircle2 },
  annule:   { label: 'Annulé',    color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-400',     icon: X },
};

const DIFF_CONFIG = {
  surplus:  { label: 'Surplus',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: TrendingUp,   iconColor: 'text-emerald-500' },
  manque:   { label: 'Manque',    color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: TrendingDown, iconColor: 'text-red-500'     },
  conforme: { label: 'Conforme',  color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: Minus,        iconColor: 'text-blue-500'    },
};

// ─── Map Functions ────────────────────────────────────────────────────────────

const mapStorageProduct = (row: any): StorageProduct => ({
  id: row.id,
  designation: row.designation,
  refProduct: row.ref_product || '',
  barCode: row.bar_code || '',
  famille: row.famille || '',
  uniteMesure: row.unite_mesure || '',
  localisation: row.localisation || '',
  currentQuantity: row.current_quantity,
  prixAchatHT: row.prix_achat_ht,
  prixVente: row.prix_vente,
});

const mapInventaireLine = (row: any, product: StorageProduct): InventaireLine => ({
  id: row.id,
  product,
  quantiteComptee: row.quantite_comptee,
  observation: row.observation || '',
});

const mapInventaire = (row: any, allProducts: StorageProduct[]): Inventaire => {
  const lines = (row.inventaire_lines || []).map((l: any) => {
    const product = allProducts.find(p => p.id === l.product_id) || {
      id: l.product_id || '',
      designation: 'Produit inconnu',
      refProduct: '',
      barCode: '',
      famille: '',
      uniteMesure: '',
      localisation: '',
      currentQuantity: l.quantite_systeme,
      prixAchatHT: 0,
      prixVente: 0,
    };
    return mapInventaireLine(l, product);
  });
  return {
    id: row.id,
    numero: row.numero,
    date: row.date,
    responsable: row.responsable || '',
    lieu: row.lieu || '',
    status: row.status as 'en_cours' | 'valide' | 'annule',
    lines,
    notes: row.notes || '',
    totalArticles: row.total_articles || 0,
    totalValeur: row.total_valeur || 0,
  };
}

// ─── Print Functions ──────────────────────────────────────────────────────────

function printInventaire(inv: Inventaire) {
  const win = window.open('', '_blank');
  if (!win) return;

  const rows = inv.lines.map((l, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><strong>${l.product.designation}</strong><br><small>${l.product.refProduct} · ${l.product.barCode}</small></td>
      <td class="center">${l.product.famille}</td>
      <td class="center">${l.product.localisation}</td>
      <td class="center">${fmtNum(l.quantiteComptee)} ${l.product.uniteMesure}</td>
      <td class="right">${fmt(l.product.prixAchatHT)}</td>
      <td class="right"><strong>${fmt(l.quantiteComptee * l.product.prixAchatHT)}</strong></td>
      <td>${l.observation || '—'}</td>
    </tr>`).join('');

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Inventaire - ${inv.numero}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:30px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0ea5e9}
      .company-name{font-size:20px;font-weight:900;color:#0ea5e9}
      .company-detail{font-size:10px;color:#666;margin-top:3px}
      .doc-type{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#1a1a2e;text-align:right}
      .doc-num{font-size:13px;font-weight:700;color:#0ea5e9;text-align:right;margin-top:4px}
      .meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
      .meta-box{background:#f0f9ff;border-radius:8px;padding:12px;border-left:3px solid #0ea5e9}
      .meta-label{font-size:9px;font-weight:900;color:#0ea5e9;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
      .meta-val{font-size:12px;font-weight:800;color:#1a1a2e}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      thead tr{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white}
      th{padding:9px 7px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
      th.center,td.center{text-align:center}
      th.right,td.right{text-align:right}
      tbody tr{border-bottom:1px solid #e0f2fe}
      tbody tr:nth-child(even){background:#f0f9ff}
      td{padding:8px 7px;font-size:10px}
      td small{color:#888;font-size:9px}
      .totals{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px}
      .total-card{flex:1;background:#f0f9ff;border-radius:10px;padding:14px 18px;border:1px solid #bae6fd}
      .total-label{font-size:9px;font-weight:700;color:#0284c7;text-transform:uppercase;margin-bottom:4px}
      .total-val{font-size:16px;font-weight:900;color:#0ea5e9}
      .notes{background:#fffbeb;border-radius:8px;padding:12px;margin-bottom:18px;font-size:10px;border-left:3px solid #f59e0b}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:800;text-transform:uppercase;background:#e0f2fe;color:#0369a1}
      .signatures{display:flex;justify-content:space-between;margin-top:36px}
      .sig{text-align:center;width:28%}
      .sig-line{border-top:1px solid #ccc;padding-top:8px;font-size:9px;font-weight:700;color:#888;margin-top:44px}
      @media print{body{padding:12px}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="company-name">Mon Entreprise</div>
        <div class="company-detail">Alger, Algérie · +213 00 00 00 00</div>
        <div class="company-detail">NIF: 000000000000000 · RC: 00/00-0000000</div>
      </div>
      <div>
        <div class="doc-type">Fiche d'Inventaire</div>
        <div class="doc-num">${inv.numero}</div>
        <div style="font-size:10px;color:#666;text-align:right;margin-top:3px">Date: ${inv.date}</div>
        <div style="margin-top:5px;text-align:right"><span class="badge">${STATUS_MAP[inv.status]?.label}</span></div>
      </div>
    </div>
    <div class="meta" style="grid-template-columns: 1fr;">
      <div class="meta-box"><div class="meta-label">Nombre d'Articles</div><div class="meta-val">${inv.lines.length} références</div></div>
    </div>
    <table>
      <thead><tr>
        <th class="center">#</th><th>Désignation</th><th class="center">Famille</th>
        <th class="center">Localisation</th><th class="center">Qté Comptée</th>
        <th class="right">P.U HT</th><th class="right">Valeur HT</th><th>Observation</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="total-card"><div class="total-label">Total Références</div><div class="total-val">${inv.lines.length}</div></div>
      <div class="total-card"><div class="total-label">Total Unités</div><div class="total-val">${fmtNum(inv.lines.reduce((s, l) => s + l.quantiteComptee, 0))}</div></div>
      <div class="total-card" style="flex:2"><div class="total-label">Valeur Totale HT</div><div class="total-val">${fmt(inv.lines.reduce((s, l) => s + l.quantiteComptee * l.product.prixAchatHT, 0))}</div></div>
    </div>
    ${inv.notes ? `<div class="notes"><strong>Remarques:</strong> ${inv.notes}</div>` : ''}
    <div class="signatures">
      <div class="sig"><div class="sig-line">Responsable Inventaire</div></div>
      <div class="sig"><div class="sig-line">Chef de Stock</div></div>
      <div class="sig"><div class="sig-line">Direction</div></div>
    </div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
  win.document.close();
}

function printDiff(inv: Inventaire, diffs: DiffLine[]) {
  const win = window.open('', '_blank');
  if (!win) return;
  const surplus = diffs.filter(d => d.statut === 'surplus');
  const manques = diffs.filter(d => d.statut === 'manque');
  const conformes = diffs.filter(d => d.statut === 'conforme');
  const totalEcart = diffs.reduce((s, d) => s + Math.abs(d.ecartValeur), 0);

  const rows = diffs.map((d, i) => {
    const color = d.statut === 'surplus' ? '#065f46' : d.statut === 'manque' ? '#991b1b' : '#1e40af';
    const bg = d.statut === 'surplus' ? '#d1fae5' : d.statut === 'manque' ? '#fee2e2' : '#dbeafe';
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
      <td>${d.product.designation}<br><small>${d.product.refProduct}</small></td>
      <td class="center">${d.quantiteSysteme} ${d.product.uniteMesure}</td>
      <td class="center">${d.quantiteComptee} ${d.product.uniteMesure}</td>
      <td class="center" style="font-weight:900;color:${color}">${d.ecart > 0 ? '+' : ''}${d.ecart}</td>
      <td class="right" style="font-weight:900;color:${color}">${d.ecartValeur > 0 ? '+' : ''}${fmt(d.ecartValeur)}</td>
      <td class="center"><span style="background:${bg};color:${color};padding:2px 8px;border-radius:4px;font-size:9px;font-weight:800">${d.statut.toUpperCase()}</span></td>
    </tr>`;
  }).join('');

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Rapport d'Écart - ${inv.numero}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:30px}
      h1{font-size:20px;font-weight:900;color:#0ea5e9;margin-bottom:4px}
      .sub{color:#666;font-size:11px;margin-bottom:20px}
      .summary{display:flex;gap:12px;margin-bottom:20px}
      .sum-card{flex:1;padding:14px;border-radius:8px;border-left:4px solid}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      thead tr{background:#0ea5e9;color:white}
      th{padding:9px 7px;text-align:left;font-size:9px;font-weight:800;text-transform:uppercase}
      th.center,td.center{text-align:center}th.right,td.right{text-align:right}
      td{padding:8px 7px;font-size:10px;border-bottom:1px solid #e5e7eb}
      td small{color:#888;font-size:9px}
      @media print{body{padding:12px}}
    </style></head><body>
    <h1>Rapport d'Écart d'Inventaire</h1>
    <div class="sub">Inventaire: ${inv.numero} · Date: ${inv.date}</div>
    <div class="summary">
      <div class="sum-card" style="background:#d1fae5;border-color:#10b981">
        <div style="font-size:9px;font-weight:700;color:#065f46;text-transform:uppercase">Surplus</div>
        <div style="font-size:18px;font-weight:900;color:#10b981">${surplus.length} articles</div>
        <div style="font-size:10px;color:#065f46">+${fmt(surplus.reduce((s, d) => s + d.ecartValeur, 0))}</div>
      </div>
      <div class="sum-card" style="background:#fee2e2;border-color:#ef4444">
        <div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase">Manques</div>
        <div style="font-size:18px;font-weight:900;color:#ef4444">${manques.length} articles</div>
        <div style="font-size:10px;color:#991b1b">${fmt(manques.reduce((s, d) => s + d.ecartValeur, 0))}</div>
      </div>
      <div class="sum-card" style="background:#dbeafe;border-color:#3b82f6">
        <div style="font-size:9px;font-weight:700;color:#1e40af;text-transform:uppercase">Conformes</div>
        <div style="font-size:18px;font-weight:900;color:#3b82f6">${conformes.length} articles</div>
      </div>
      <div class="sum-card" style="background:#f1f5f9;border-color:#64748b">
        <div style="font-size:9px;font-weight:700;color:#475569;text-transform:uppercase">Écart Total</div>
        <div style="font-size:18px;font-weight:900;color:#0f172a">${fmt(totalEcart)}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Produit</th><th class="center">Stock Système</th><th class="center">Qté Comptée</th><th class="center">Écart Qté</th><th class="right">Écart Valeur</th><th class="center">Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
  win.document.close();
}

// ─── Product Search (for form) ────────────────────────────────────────────────

function ProductSearch({ onSelect, excludeIds, products }: { onSelect: (p: StorageProduct) => void; excludeIds: string[]; products: StorageProduct[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const results = products.filter(p =>
    !excludeIds.includes(p.id) && (
      p.designation.toLowerCase().includes(q.toLowerCase()) ||
      p.refProduct.toLowerCase().includes(q.toLowerCase()) ||
      p.barCode.includes(q)
    )
  ).slice(0, 7);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={15} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Rechercher un produit par nom, référence ou code barre..."
          className="w-full bg-gradient-to-br from-white to-sky-50/40 border border-sky-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 outline-none shadow-sm" />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden">
            {results.map(p => (
              <button key={p.id} onClick={() => { onSelect(p); setQ(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-sky-50 hover:to-cyan-50 transition-all border-b border-gray-50 last:border-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                  <Package size={15} className="text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.designation}</p>
                  <p className="text-xs text-gray-400 font-semibold">{p.refProduct} · {p.localisation} · Stock: <span className="text-sky-600 font-bold">{p.currentQuantity} {p.uniteMesure}</span></p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold text-sky-600">{fmt(p.prixAchatHT)}</p>
                  <p className="text-[10px] text-gray-400">{p.famille}</p>
                </div>
              </button>
            ))}
            {results.length === 0 && q && (
              <div className="px-4 py-4 text-center text-sm text-gray-400 font-medium">Aucun produit trouvé</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compare Modal ────────────────────────────────────────────────────────────

function CompareModal({ inv, onClose }: { inv: Inventaire; onClose: () => void }) {
  const [filter, setFilter] = useState<'all' | 'surplus' | 'manque' | 'conforme'>('all');
  const [sortByEcart, setSortByEcart] = useState(false);

  const diffs: DiffLine[] = inv.lines.map(line => {
    const systemQty = line.product.currentQuantity;
    const countedQty = line.quantiteComptee;
    const ecart = countedQty - systemQty;
    const ecartValeur = ecart * line.product.prixAchatHT;
    const statut: DiffLine['statut'] = ecart > 0 ? 'surplus' : ecart < 0 ? 'manque' : 'conforme';
    return { product: line.product, quantiteSysteme: systemQty, quantiteComptee: countedQty, ecart, ecartValeur, statut };
  });

  const filtered = diffs
    .filter(d => filter === 'all' || d.statut === filter)
    .sort((a, b) => sortByEcart ? Math.abs(b.ecartValeur) - Math.abs(a.ecartValeur) : 0);

  const surplus = diffs.filter(d => d.statut === 'surplus');
  const manques = diffs.filter(d => d.statut === 'manque');
  const conformes = diffs.filter(d => d.statut === 'conforme');
  const totalEcartPos = surplus.reduce((s, d) => s + d.ecartValeur, 0);
  const totalEcartNeg = manques.reduce((s, d) => s + d.ecartValeur, 0);
  const tauxConformite = diffs.length > 0 ? Math.round((conformes.length / diffs.length) * 100) : 100;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <GitCompare size={22} /> Analyse des Écarts
              </h2>
              <p className="text-sky-200 font-bold text-sm mt-1">{inv.numero} · Comparaison Inventaire vs Stock Système</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => printDiff(inv, diffs)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold text-sm transition-all">
                <Printer size={15} /> Imprimer
              </button>
              <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={20} /></button>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Surplus</span>
              </div>
              <p className="text-2xl font-black text-emerald-700">{surplus.length}</p>
              <p className="text-xs font-bold text-emerald-500 mt-1">+{fmt(totalEcartPos)}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown size={14} className="text-red-600" />
                </div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Manques</span>
              </div>
              <p className="text-2xl font-black text-red-700">{manques.length}</p>
              <p className="text-xs font-bold text-red-500 mt-1">{fmt(totalEcartNeg)}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Minus size={14} className="text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Conformes</span>
              </div>
              <p className="text-2xl font-black text-blue-700">{conformes.length}</p>
              <p className="text-xs font-bold text-blue-500 mt-1">0 DA d'écart</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-16 h-16 bg-white/10 rounded-full -mr-4 -mt-4 blur-xl" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block mb-2">Taux Conformité</span>
                <p className="text-3xl font-black">{tauxConformite}%</p>
                <div className="mt-2 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${tauxConformite}%` }}
                    className="h-full bg-white rounded-full" transition={{ delay: 0.5, duration: 0.8 }} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(['all', 'surplus', 'manque', 'conforme'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {f === 'all' ? `Tout (${diffs.length})` : f === 'surplus' ? `Surplus (${surplus.length})` : f === 'manque' ? `Manques (${manques.length})` : `Conformes (${conformes.length})`}
              </button>
            ))}
            <button onClick={() => setSortByEcart(s => !s)}
              className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortByEcart ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              <BarChart3 size={13} /> Trier par Écart
            </button>
          </div>

          {/* Diff Table */}
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-sky-50/80 to-cyan-50/50 border-b border-sky-100">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stock Système</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Qté Comptée</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Écart Qté</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Écart Valeur</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d, i) => {
                  const cfg = DIFF_CONFIG[d.statut];
                  const DiffIcon = cfg.icon;
                  return (
                    <motion.tr key={d.product.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`transition-all hover:bg-gray-50/80 ${d.statut !== 'conforme' ? cfg.bg + '/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${d.statut === 'surplus' ? 'bg-emerald-100' : d.statut === 'manque' ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <DiffIcon size={14} className={cfg.iconColor} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{d.product.designation}</p>
                            <p className="text-xs text-gray-400">{d.product.refProduct} · {d.product.localisation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-gray-700">{fmtNum(d.quantiteSysteme)}</span>
                        <span className="text-gray-400 text-xs ml-1">{d.product.uniteMesure}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-gray-700">{fmtNum(d.quantiteComptee)}</span>
                        <span className="text-gray-400 text-xs ml-1">{d.product.uniteMesure}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-0.5 font-black text-base ${cfg.color}`}>
                          {d.ecart > 0 ? '+' : ''}{fmtNum(d.ecart)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-black text-sm ${cfg.color}`}>
                          {d.ecartValeur > 0 ? '+' : ''}{fmt(d.ecartValeur)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-gray-400 font-semibold">Aucun résultat pour ce filtre</div>
            )}
          </div>

          {/* Bottom summary */}
          <div className="mt-4 flex gap-4 flex-wrap">
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Écart Total Positif (Surplus)</p>
              <p className="text-xl font-black text-emerald-600">+{fmt(totalEcartPos)}</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Écart Total Négatif (Manques)</p>
              <p className="text-xl font-black text-red-600">{fmt(totalEcartNeg)}</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Écart Net Total</p>
              <p className={`text-xl font-black ${totalEcartPos + totalEcartNeg >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(totalEcartPos + totalEcartNeg)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ inv, onClose, onCompare }: { inv: Inventaire; onClose: () => void; onCompare: () => void }) {
  const st = STATUS_MAP[inv.status];
  const totalVal = inv.lines.reduce((s, l) => s + l.quantiteComptee * l.product.prixAchatHT, 0);
  const totalUnits = inv.lines.reduce((s, l) => s + l.quantiteComptee, 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto">

        <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2"><ClipboardList size={22} /> Détails Inventaire</h2>
              <p className="text-sky-200 font-bold text-lg mt-1">{inv.numero}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${st.bg} ${st.color}`}>{st.label}</span>
              <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={20} /></button>
            </div>
          </div>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[
              { label: 'Date', val: inv.date, icon: Calendar },
              { label: 'Total Références', val: `${inv.lines.length} articles`, icon: Package },
            ].map(item => (
              <div key={item.label} className="bg-gradient-to-br from-sky-50 to-cyan-50/50 rounded-2xl p-4 border border-sky-100">
                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="font-black text-gray-900">{item.val}</p>
              </div>
            ))}
          </div>

          {/* Value Summary */}
          <div className="mb-6 bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sky-200 text-xs font-bold uppercase tracking-widest mb-1">Valeur Totale HT Inventoriée</p>
                <p className="text-4xl font-black">{fmt(totalVal)}</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-sky-200 text-[10px] font-bold uppercase mb-1">Références</p>
                  <p className="text-2xl font-black">{inv.lines.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sky-200 text-[10px] font-bold uppercase mb-1">Total Unités</p>
                  <p className="text-2xl font-black">{fmtNum(totalUnits)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lines table */}
          <div className="bg-gradient-to-br from-sky-50/30 to-cyan-50/20 rounded-2xl border border-sky-100 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-sky-50/80 to-cyan-50/50 border-b border-sky-100">
                  {['#', 'Désignation', 'Famille', 'Localisation', 'Stock Système', 'Qté Comptée', 'Valeur HT', 'Observation'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/50">
                {inv.lines.map((line, i) => {
                  const diff = line.quantiteComptee - line.product.currentQuantity;
                  return (
                    <tr key={line.id} className="hover:bg-white/60">
                      <td className="px-4 py-3 text-gray-400 font-bold text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{line.product.designation}</p>
                        <p className="text-xs text-gray-400">{line.product.refProduct}</p>
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-lg text-[10px] font-bold">{line.product.famille}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-medium">{line.product.localisation}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-600">{fmtNum(line.product.currentQuantity)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-sky-700">{fmtNum(line.quantiteComptee)}</span>
                        {diff !== 0 && (
                          <span className={`ml-1.5 text-[10px] font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            ({diff > 0 ? '+' : ''}{diff})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-sky-700">{fmt(line.quantiteComptee * line.product.prixAchatHT)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{line.observation || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {inv.notes && (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Remarques</p>
              <p className="text-sm text-gray-700">{inv.notes}</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-sky-100 bg-gradient-to-r from-sky-50/50 to-cyan-50/30 flex justify-between items-center">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">Fermer</button>
          <div className="flex gap-3">
            <button onClick={() => printInventaire(inv)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:shadow-sky-500/40 hover:shadow-xl transition-all">
              <Printer size={15} /> Imprimer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function InventaireForm({ inv, onClose, onSave, storageProducts }: { inv?: Inventaire; onClose: () => void; onSave: (i: Inventaire) => void; storageProducts: StorageProduct[] }) {
  const isNew = !inv;
  const [form, setForm] = useState<Inventaire>(inv || {
    id: genId(), numero: genNum(),
    date: new Date().toISOString().split('T')[0],
    responsable: '', lieu: '',
    status: 'en_cours', lines: [],
    notes: '', totalArticles: 0, totalValeur: 0,
  });

  const totalVal = form.lines.reduce((s, l) => s + l.quantiteComptee * l.product.prixAchatHT, 0);
  const totalUnits = form.lines.reduce((s, l) => s + l.quantiteComptee, 0);

  const addProduct = (p: StorageProduct) => {
    const line: InventaireLine = { id: genId(), product: p, quantiteComptee: p.currentQuantity, observation: '' };
    setForm(f => ({ ...f, lines: [...f.lines, line] }));
  };

  const updateLine = (id: string, field: 'quantiteComptee' | 'observation', value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map(l => l.id === id ? { ...l, [field]: value } : l) }));
  };

  const removeLine = (id: string) => {
    setForm(f => ({ ...f, lines: f.lines.filter(l => l.id !== id) }));
  };

  const handleSave = () => {
    onSave({ ...form, totalArticles: form.lines.length, totalValeur: totalVal });
    onClose();
  };

  const existingIds = form.lines.map(l => l.product.id);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ClipboardList size={20} /> {isNew ? 'Nouvel' : 'Modifier'} Inventaire
            </h2>
            <p className="text-sky-200 text-sm font-semibold mt-0.5">{form.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"><X size={20} /></button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {/* Meta fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Inventaire</label>
              <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-sky-50/30 border border-sky-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date d'Inventaire</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gradient-to-br from-white to-sky-50/30 border border-sky-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 outline-none" />
            </div>
          </div>

          {/* Product search */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Ajouter des Produits à Inventorier
              <span className="ml-2 text-sky-600 font-bold normal-case">(Quantités pré-remplies avec stock actuel)</span>
            </label>
            <ProductSearch onSelect={addProduct} excludeIds={existingIds} products={storageProducts} />
          </div>

          {/* Lines */}
          {form.lines.length > 0 ? (
            <div className="bg-gradient-to-br from-sky-50/30 to-cyan-50/20 rounded-2xl border border-sky-100 overflow-hidden mb-6">
              {/* Summary bar */}
              <div className="px-5 py-3 bg-gradient-to-r from-sky-600/10 to-cyan-600/10 border-b border-sky-100 flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700">{form.lines.length} référence(s) · {fmtNum(totalUnits)} unités au total</span>
                <span className="text-xs font-black text-sky-700">Valeur HT: {fmt(totalVal)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-sky-50/80 to-cyan-50/50 border-b border-sky-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Désignation</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Stock Actuel</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">Qté Comptée</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Écart</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">Valeur HT</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Observation</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/50">
                    {form.lines.map(line => {
                      const diff = line.quantiteComptee - line.product.currentQuantity;
                      const diffColor = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-blue-500';
                      return (
                        <tr key={line.id} className="hover:bg-white/60 transition-all">
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900">{line.product.designation}</p>
                            <p className="text-xs text-gray-400">{line.product.refProduct} · <span className="text-sky-500">{line.product.localisation}</span></p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                              {fmtNum(line.product.currentQuantity)} {line.product.uniteMesure}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" min="0" value={line.quantiteComptee}
                              onChange={e => updateLine(line.id, 'quantiteComptee', Math.max(0, Number(e.target.value)))}
                              className="w-full text-center bg-white border border-sky-200 rounded-lg py-1.5 px-2 text-sm font-black text-sky-700 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-sm ${diffColor}`}>
                              {diff > 0 ? '+' : ''}{fmtNum(diff)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-sky-700 text-sm">
                            {fmt(line.quantiteComptee * line.product.prixAchatHT)}
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={line.observation || ''} placeholder="Observation..."
                              onChange={e => updateLine(line.id, 'observation', e.target.value)}
                              className="w-full bg-white border border-sky-100 rounded-lg py-1.5 px-2 text-xs font-medium focus:ring-2 focus:ring-sky-500/20 outline-none" />
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-all">
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end p-4 border-t border-sky-100">
                <div className="min-w-72 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total Références:</span><span>{form.lines.length} articles</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Total Unités:</span><span>{fmtNum(totalUnits)} unités</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-sky-700 border-t border-sky-200 pt-2">
                    <span>VALEUR TOTALE HT:</span><span>{fmt(totalVal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 py-12 text-center bg-gradient-to-br from-sky-50/50 to-cyan-50/30 rounded-2xl border-2 border-dashed border-sky-200">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center mx-auto mb-3">
                <Package className="text-sky-400" size={26} />
              </div>
              <p className="text-gray-500 font-bold text-sm">Recherchez et sélectionnez des produits à inventorier</p>
              <p className="text-gray-400 text-xs mt-1">Les quantités seront pré-remplies avec le stock système actuel</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes / Observations Générales</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="Conditions de l'inventaire, incidents, remarques générales..."
              className="w-full bg-gradient-to-br from-white to-sky-50/30 border border-sky-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 outline-none resize-none" />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-sky-100 bg-gradient-to-r from-sky-50/50 to-cyan-50/30 flex items-center justify-between">
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">Annuler</button>
          <div className="flex items-center gap-2 text-xs text-gray-400 mx-4">
            <Package size={13} />{form.lines.length} produit(s) · {fmt(totalVal)}
          </div>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:shadow-sky-500/40 hover:shadow-xl transition-all">
            <Check size={16} /> {isNew ? 'Créer l\'Inventaire' : 'Enregistrer les Modifications'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const InventairePage: React.FC = () => {
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [storageProducts, setStorageProducts] = useState<StorageProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInv, setEditingInv] = useState<Inventaire | undefined>();
  const [viewingInv, setViewingInv] = useState<Inventaire | undefined>();
  const [comparingInv, setComparingInv] = useState<Inventaire | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventairesRes, productsRes] = await Promise.all([
        supabase.from('inventaires')
          .select('*, inventaire_lines(*)')
          .order('date', { ascending: false }),
        supabase.from('products')
          .select('id, designation, ref_product, bar_code, famille, unite_mesure, localisation, current_quantity, prix_achat_ht, prix_vente')
          .order('designation'),
      ]);
      const products = (productsRes.data || []).map(mapStorageProduct);
      setStorageProducts(products);
      if (inventairesRes.data) {
        setInventaires(inventairesRes.data.map((row: any) => mapInventaire(row, products)));
      }
    } catch (err) {
      console.error('Error loading inventaires:', err);
    }
    setLoading(false);
  }

  const filtered = inventaires.filter(inv => {
    const matchSearch = inv.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.responsable || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.lieu || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (inv: Inventaire) => {
    try {
      const totalArticles = (inv.lines || []).length;
      const totalValeur = (inv.lines || []).reduce((s, l) => {
        const product = storageProducts.find(p => p.id === l.product.id);
        return s + (product?.prixAchatHT || 0) * l.quantiteComptee;
      }, 0);

      const isNew = inv.id.length < 10;

      if (isNew) {
        const { data: newInv, error } = await supabase
          .from('inventaires')
          .insert({
            numero: inv.numero || `INV-${Date.now()}`,
            date: inv.date || new Date().toISOString().split('T')[0],
            responsable: inv.responsable || null,
            lieu: inv.lieu || null,
            status: 'en_cours',
            total_articles: totalArticles,
            total_valeur: totalValeur,
            notes: inv.notes || null,
          })
          .select().single();

        if (error || !newInv) throw error;

        const linesPayload = (inv.lines || []).map(l => ({
          inventaire_id: newInv.id,
          product_id: l.product.id,
          quantite_systeme: l.product.currentQuantity,
          quantite_comptee: l.quantiteComptee,
          observation: l.observation || null,
        }));
        if (linesPayload.length > 0) {
          await supabase.from('inventaire_lines').insert(linesPayload);
        }
      } else {
        await supabase
          .from('inventaires')
          .update({
            numero: inv.numero,
            date: inv.date,
            responsable: inv.responsable || null,
            lieu: inv.lieu || null,
            total_articles: totalArticles,
            total_valeur: totalValeur,
            notes: inv.notes || null,
          })
          .eq('id', inv.id);

        await supabase.from('inventaire_lines').delete().eq('inventaire_id', inv.id);

        const linesPayload = (inv.lines || []).map(l => ({
          inventaire_id: inv.id,
          product_id: l.product.id,
          quantite_systeme: l.product.currentQuantity,
          quantite_comptee: l.quantiteComptee,
          observation: l.observation || null,
        }));
        if (linesPayload.length > 0) {
          await supabase.from('inventaire_lines').insert(linesPayload);
        }
      }
      await loadData();
    } catch (err) {
      console.error('Error saving inventaire:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleCompare = async (inv: Inventaire) => {
    try {
      await supabase.from('inventaires').update({ status: 'valide' }).eq('id', inv.id);
      const updated = { ...inv, status: 'valide' as const };
      setComparingInv(updated);
    } catch (err) {
      console.error('Error validating inventaire:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cet inventaire définitivement ?')) {
      try {
        await supabase.from('inventaire_lines').delete().eq('inventaire_id', id);
        await supabase.from('inventaires').delete().eq('id', id);
        await loadData();
      } catch (err) {
        console.error('Error deleting inventaire:', err);
      }
    }
  };

  const totalVal = inventaires.reduce((s, i) => s + i.totalValeur, 0);
  const enCours = inventaires.filter(i => i.status === 'en_cours').length;
  const valides = inventaires.filter(i => i.status === 'valide').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Inventaire
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gestion et contrôle des stocks · Analyses des écarts</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingInv(undefined); setShowForm(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-sky-500/40 transition-all w-full md:w-auto">
          <Plus size={20} /> Nouvel Inventaire
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl col-span-2">
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -mr-28 -mt-28 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <span className="text-xs font-bold uppercase tracking-widest">Valeur Totale Inventoriée</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight">{fmt(totalVal)}</h2>
            <div className="mt-5 flex gap-3 flex-wrap">
              {[
                { label: 'Total Inventaires', val: inventaires.length },
                { label: 'En Cours', val: enCours },
                { label: 'Validés', val: valides },
                { label: 'Total Produits', val: inventaires.reduce((s, i) => s + i.totalArticles, 0) },
              ].map(s => (
                <div key={s.label} className="px-4 py-2.5 bg-white/15 backdrop-blur-lg rounded-xl border border-white/20">
                  <p className="text-[10px] font-bold opacity-75 uppercase mb-1">{s.label}</p>
                  <p className="text-lg font-black">{fmtNum(s.val)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-sky-50/30 rounded-3xl p-6 border border-sky-100/50 shadow-xl">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-sky-500" /> Répartition par statut
          </h3>
          <div className="space-y-3">
            {Object.entries(STATUS_MAP).map(([key, val]) => {
              const count = inventaires.filter(i => i.status === key).length;
              const pct = inventaires.length ? Math.round(count / inventaires.length * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${val.dot}`} />{val.label}
                    </span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>
          {inventaires.length === 0 && (
            <div className="mt-4 text-center py-4 text-gray-300">
              <ClipboardList size={32} className="mx-auto mb-2" />
              <p className="text-xs font-medium">Aucun inventaire</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-white to-sky-50/20 rounded-3xl border border-sky-100/50 shadow-xl overflow-hidden">

        {/* Table toolbar */}
        <div className="p-6 md:p-8 border-b border-sky-100/50 bg-gradient-to-r from-sky-50/50 to-cyan-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Liste des Inventaires</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{inventaires.length} inventaire(s) au total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Rechercher par N°, responsable, lieu..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 focus:ring-4 focus:ring-sky-500/30 focus:border-sky-500 outline-none w-full md:w-64 text-sm font-medium shadow-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm font-medium focus:ring-4 focus:ring-sky-500/30 outline-none shadow-sm">
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-sky-50/30 to-cyan-50/30 border-b border-sky-100/50">
                {['N° Inventaire', 'Date', 'Articles', 'Valeur HT', 'Statut', 'Actions'].map(h => (
                  <th key={h} className={`px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest ${h === 'Actions' ? 'text-end' : 'text-start'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/30">
              {filtered.map((inv, idx) => {
                const st = STATUS_MAP[inv.status];
                const StIcon = st.icon;
                return (
                  <motion.tr key={inv.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                    className="hover:bg-gradient-to-r hover:from-sky-50/50 hover:to-cyan-50/50 transition-all group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/20">
                          <ClipboardList size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-black text-gray-900 font-mono">{inv.numero}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-600 font-mono">{inv.date}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="px-3 py-1.5 bg-gradient-to-r from-sky-100 to-cyan-100 text-sky-700 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit">
                          {inv.totalArticles} réf.
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-extrabold text-sm text-sky-700">{fmt(inv.totalValeur)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider w-fit ${st.bg} ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View */}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setViewingInv(inv)} className="action-btn-info" title="Voir détails">
                          <Eye size={16} />
                        </motion.button>
                        {/* Edit */}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                          onClick={() => { setEditingInv(inv); setShowForm(true); }} className="action-btn-edit" title="Modifier">
                          <Edit size={16} />
                        </motion.button>
                        {/* Compare */}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleCompare(inv)}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 text-cyan-600 hover:from-cyan-100 hover:to-teal-100 hover:border-cyan-400 transition-all flex items-center justify-center"
                          title="Analyser les écarts (changera le statut à Validé)">
                          <GitCompare size={15} />
                        </motion.button>
                        {/* Print */}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                          onClick={() => printInventaire(inv)} className="action-btn-print" title="Imprimer">
                          <Printer size={16} />
                        </motion.button>
                        {/* Delete */}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(inv.id)} className="action-btn-delete" title="Supprimer">
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-600 mx-auto mb-5 flex items-center justify-center opacity-20">
                <ClipboardList size={36} className="text-white" />
              </div>
              <p className="text-gray-400 font-bold text-lg italic">
                {inventaires.length === 0 ? 'Aucun inventaire créé' : 'Aucun résultat pour cette recherche'}
              </p>
              {inventaires.length === 0 && (
                <div className="mt-2 text-gray-300 text-sm max-w-xs mx-auto">
                  Créez votre premier inventaire pour compter et contrôler vos stocks
                </div>
              )}
              {inventaires.length === 0 && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingInv(undefined); setShowForm(true); }}
                  className="mt-5 inline-flex items-center gap-2 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 text-white px-7 py-3.5 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-sky-500/40 transition-all">
                  <Plus size={18} /> Créer le premier inventaire
                </motion.button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <InventaireForm
            inv={editingInv}
            onClose={() => { setShowForm(false); setEditingInv(undefined); }}
            onSave={handleSave}
            storageProducts={storageProducts}
          />
        )}
        {viewingInv && (
          <ViewModal
            inv={viewingInv}
            onClose={() => setViewingInv(undefined)}
            onCompare={() => setComparingInv(viewingInv)}
          />
        )}
        {comparingInv && (
          <CompareModal
            inv={comparingInv}
            onClose={() => setComparingInv(undefined)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventairePage;
