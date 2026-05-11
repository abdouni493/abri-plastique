/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rapports — Comprehensive Financial & Commercial Intelligence Center
 * Fully redesigned with deep statistics from ALL app modules
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Download, Printer, Search, Calendar, Filter,
  ChevronDown, ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Landmark, Wallet, TrendingUp, TrendingDown, Users, Package,
  ShoppingCart, Truck, BarChart2, PieChart, Activity, Eye,
  X, ChevronRight, RefreshCw, AlertTriangle, CheckCircle,
  Clock, CreditCard, Building2, UserCheck, Layers, Box,
  ReceiptText, FileCheck, Star, Target, Zap, Globe,
  DollarSign, Hash, Percent, ArrowUpDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { formatAmount, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart as RechartPie,
  Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportModule {
  id: string;
  label: string;
  icon: any;
  color: string;
  gradient: string;
  description: string;
  path: string;
}

type ActiveTab = 'situation' | 'caisse' | 'banque' | 'ventes' | 'achats' |
  'clients' | 'fournisseurs' | 'stockage' | 'production' | 'transferts' |
  'utilisateurs' | 'inventaire' | 'documents';

type Period = 'today' | 'yesterday' | 'current_week' | 'current_month' | 'last_month' | 'current_year' | 'custom';

// ─── Constants ───────────────────────────────────────────────────────────────

const MODULES: ReportModule[] = [
  { id: 'situation', label: 'Situation Globale', icon: Activity, color: 'text-violet-600', gradient: 'from-violet-600 via-purple-600 to-indigo-600', description: 'Vue d\'ensemble consolidée', path: '/' },
  { id: 'caisse', label: 'Caisse', icon: Wallet, color: 'text-emerald-600', gradient: 'from-emerald-600 via-teal-600 to-cyan-600', description: 'Flux espèces', path: '/caisse' },
  { id: 'banque', label: 'Banque', icon: Landmark, color: 'text-blue-600', gradient: 'from-blue-600 via-cyan-600 to-sky-600', description: 'Comptes bancaires', path: '/banque' },
  { id: 'ventes', label: 'Ventes', icon: ShoppingCart, color: 'text-indigo-600', gradient: 'from-indigo-600 via-blue-600 to-violet-600', description: 'Chiffre d\'affaires', path: '/ventes' },
  { id: 'achats', label: 'Achats & Dettes', icon: Package, color: 'text-amber-600', gradient: 'from-amber-600 via-orange-600 to-yellow-600', description: 'Achats & dettes fournisseurs', path: '/achats' },
  { id: 'clients', label: 'Clients', icon: Users, color: 'text-rose-600', gradient: 'from-rose-600 via-pink-600 to-fuchsia-600', description: 'Portefeuille clients', path: '/clients' },
  { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck, color: 'text-orange-600', gradient: 'from-orange-600 via-amber-600 to-yellow-600', description: 'Réseau fournisseurs', path: '/fournisseurs' },
  { id: 'stockage', label: 'Stockage', icon: Box, color: 'text-teal-600', gradient: 'from-teal-600 via-emerald-600 to-green-600', description: 'Inventaire produits', path: '/stockage' },
  { id: 'transferts', label: 'Transferts', icon: ArrowLeftRight, color: 'text-cyan-600', gradient: 'from-cyan-600 via-sky-600 to-blue-600', description: 'Virements internes', path: '/transfert' },
  { id: 'documents', label: 'Documents', icon: FileCheck, color: 'text-purple-600', gradient: 'from-purple-600 via-violet-600 to-indigo-600', description: 'BL, BC, BR, Factures', path: '/bon-commande' },
];

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Aujourd\'hui',
  yesterday: 'Hier',
  current_week: 'Cette semaine',
  current_month: 'Ce mois',
  last_month: 'Mois précédent',
  current_year: 'Cette année',
  custom: 'Personnalisé',
};

const CHART_COLORS = {
  violet: '#7C3AED',
  emerald: '#059669',
  blue: '#2563EB',
  rose: '#E11D48',
  amber: '#D97706',
  teal: '#0D9488',
  indigo: '#4F46E5',
  cyan: '#0891B2',
  orange: '#EA580C',
  purple: '#9333EA',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' DA';

const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};

const getDateRange = (period: Period, startDate?: string, endDate?: string) => {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: now.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    case 'yesterday': {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      return { start: y.toISOString().split('T')[0], end: y.toISOString().split('T')[0] };
    }
    case 'current_week': {
      const first = new Date(now); first.setDate(now.getDate() - now.getDay());
      return { start: first.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    case 'current_month':
      return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] };
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: lm.toISOString().split('T')[0], end: lme.toISOString().split('T')[0] };
    }
    case 'current_year':
      return { start: `${now.getFullYear()}-01-01`, end: now.toISOString().split('T')[0] };
    case 'custom':
      return { start: startDate || '', end: endDate || '' };
    default:
      return { start: '', end: '' };
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatCard = ({
  label, value, sub, icon: Icon, color, trend, onClick, delay = 0
}: {
  label: string; value: string; sub?: string; icon: any; color: string;
  trend?: { value: number; positive: boolean }; onClick?: () => void; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4, scale: 1.01 }}
    onClick={onClick}
    className={cn(
      'bg-gradient-to-br from-white to-cyan-50/20 rounded-3xl p-6 border border-cyan-100/50 shadow-xl transition-all',
      onClick && 'cursor-pointer hover:shadow-xl hover:border-cyan-200/50'
    )}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} />
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full',
          trend.positive ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100')}>
          {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend.value.toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-3xl font-black text-gray-900 tracking-tight mb-1">{value}</p>
    <p className="text-xs font-bold text-cyan-700 uppercase tracking-widest">{label}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </motion.div>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h3 className="text-xs font-bold text-cyan-700 uppercase tracking-widest pb-2 border-b border-cyan-200">{title}</h3>
    {subtitle && <p className="text-xs text-gray-600 mt-2">{subtitle}</p>}
  </div>
);

const DetailModal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.5)' }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 px-8 py-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
          <X size={16} className="text-white" />
        </button>
      </div>
      <div className="p-8">{children}</div>
    </motion.div>
  </motion.div>
);

// ─── Module Tabs ─────────────────────────────────────────────────────────────

interface ModuleTabProps {
  module: ReportModule;
  active: boolean;
  onClick: () => void;
}

const ModuleTab: React.FC<ModuleTabProps> = ({ module, active, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      'flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-all whitespace-nowrap',
      active
        ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white shadow-lg'
        : 'bg-gray-50 text-gray-500 hover:bg-cyan-50 hover:text-cyan-600'
    )}
  >
    <module.icon size={14} />
    {module.label}
  </motion.button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Rapports = () => {
  const { t, isRTL } = useLanguage();
  const { transactions, banks, clients, suppliers, debts, loading } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>('situation');
  const [period, setPeriod] = useState<Period>('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fluxType, setFluxType] = useState('all');
  const [selectedBank, setSelectedBank] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMode, setPaymentMode] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Date Range ─────────────────────────────────────────────────────────────
  const dateRange = useMemo(() => getDateRange(period, startDate, endDate), [period, startDate, endDate]);

  // ─── Filtered Transactions ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (dateRange.start && tx.date < dateRange.start) return false;
      if (dateRange.end && tx.date > dateRange.end) return false;
      if (fluxType === 'cash' && tx.source !== 'caisse') return false;
      if (fluxType === 'bank' && tx.source !== 'bank') return false;
      if (fluxType === 'transfer' && tx.category !== 'Transfert Interne') return false;
      if (selectedBank !== 'all' && tx.bankId !== selectedBank) return false;
      if (selectedClient !== 'all' && tx.clientId !== selectedClient) return false;
      if (selectedSupplier !== 'all' && tx.supplierId !== selectedSupplier) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (paymentMode !== 'all' && tx.paymentMode !== paymentMode) return false;
      if (searchTerm) {
        const target = `${tx.description} ${tx.category} ${tx.reference || ''}`.toLowerCase();
        if (!target.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [transactions, dateRange, fluxType, selectedBank, selectedClient, selectedSupplier, statusFilter, paymentMode, searchTerm]);

  // ─── Global Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const caisseT = filtered.filter(t => t.source === 'caisse');
    const bankT = filtered.filter(t => t.source === 'bank');
    const transfers = filtered.filter(t => t.category === 'Transfert Interne');
    const incomeT = filtered.filter(t => t.type === 'in' && t.category !== 'Transfert Interne');
    const expenseT = filtered.filter(t => t.type === 'out' && t.category !== 'Transfert Interne');

    const totalIn = incomeT.reduce((a, t) => a + t.amount, 0);
    const totalOut = expenseT.reduce((a, t) => a + t.amount, 0);
    const balance = totalIn - totalOut;
    const totalCaisse = caisseT.filter(t => t.type === 'in').reduce((a, t) => a + t.amount, 0)
      - caisseT.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0);
    const totalBank = banks.reduce((a, b) => a + b.balance, 0);
    const totalDebts = debts.reduce((a, d) => a + (d.totalAmount - d.paidAmount), 0);
    const totalDebtsPaid = debts.reduce((a, d) => a + d.paidAmount, 0);

    // Category breakdown
    const categories = Array.from(new Set(filtered.map(t => t.category)));
    const categoryData = categories.map(cat => {
      const catT = filtered.filter(t => t.category === cat);
      return {
        cat,
        in: catT.filter(t => t.type === 'in').reduce((a, t) => a + t.amount, 0),
        out: catT.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0),
        count: catT.length,
      };
    }).sort((a, b) => (b.in + b.out) - (a.in + a.out));

    // Monthly trend (last 6 months)
    const monthlyData: { name: string; entrees: number; sorties: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mT = transactions.filter(t => t.date.startsWith(m));
      monthlyData.push({
        name: d.toLocaleDateString('fr-FR', { month: 'short' }),
        entrees: mT.filter(t => t.type === 'in' && t.category !== 'Transfert Interne').reduce((a, t) => a + t.amount, 0),
        sorties: mT.filter(t => t.type === 'out' && t.category !== 'Transfert Interne').reduce((a, t) => a + t.amount, 0),
      });
    }

    // Payment mode breakdown
    const pmodes = ['cash', 'transfer', 'check'];
    const paymentModeData = pmodes.map(pm => ({
      name: pm === 'cash' ? 'Espèces' : pm === 'transfer' ? 'Virement' : 'Chèque',
      value: filtered.filter(t => t.paymentMode === pm).reduce((a, t) => a + t.amount, 0),
    })).filter(p => p.value > 0);

    // Client stats
    const clientStats = clients.map(c => {
      const cT = filtered.filter(t => t.clientId === c.id);
      return {
        ...c,
        total: cT.filter(t => t.type === 'in').reduce((a, t) => a + t.amount, 0),
        txCount: cT.length,
      };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    // Supplier stats
    const supplierStats = suppliers.map(s => {
      const sT = filtered.filter(t => t.supplierId === s.id);
      const sDebts = debts.filter(d => d.supplierId === s.id);
      return {
        ...s,
        total: sT.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0),
        debt: sDebts.reduce((a, d) => a + (d.totalAmount - d.paidAmount), 0),
        txCount: sT.length,
      };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    // Bank stats
    const bankStats = banks.map(b => {
      const bT = filtered.filter(t => t.bankId === b.id);
      return {
        ...b,
        in: bT.filter(t => t.type === 'in').reduce((a, t) => a + t.amount, 0),
        out: bT.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0),
        txCount: bT.length,
      };
    });

    // Cash flow by day (last 14 days)
    const dailyData: { name: string; entrees: number; sorties: number; solde: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = d.toISOString().split('T')[0];
      const dT = transactions.filter(t => t.date === day);
      const ein = dT.filter(t => t.type === 'in' && t.category !== 'Transfert Interne').reduce((a, t) => a + t.amount, 0);
      const eout = dT.filter(t => t.type === 'out' && t.category !== 'Transfert Interne').reduce((a, t) => a + t.amount, 0);
      dailyData.push({
        name: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        entrees: ein,
        sorties: eout,
        solde: ein - eout,
      });
    }

    return {
      totalIn, totalOut, balance, totalCaisse, totalBank,
      totalDebts, totalDebtsPaid,
      caisseIn: caisseT.filter(t => t.type === 'in').reduce((a, t) => a + t.amount, 0),
      caisseOut: caisseT.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0),
      bankIn: bankT.filter(t => t.type === 'in').reduce((a, t) => a + t.amount, 0),
      bankOut: bankT.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0),
      transferCount: transfers.length,
      transferTotal: transfers.reduce((a, t) => a + t.amount, 0),
      txCount: filtered.length,
      incomeCount: incomeT.length,
      expenseCount: expenseT.length,
      activeClientsCount: clients.filter(c => c.status === 'actif').length,
      inactiveClientsCount: clients.filter(c => c.status !== 'actif').length,
      debtCount: debts.filter(d => d.paidAmount < d.totalAmount).length,
      paidDebtCount: debts.filter(d => d.paidAmount >= d.totalAmount).length,
      categoryData, monthlyData, dailyData, paymentModeData,
      clientStats, supplierStats, bankStats,
      avgTransaction: filtered.length > 0 ? (totalIn + totalOut) / 2 / filtered.length : 0,
      profitMargin: totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0,
    };
  }, [filtered, transactions, banks, clients, suppliers, debts]);

  // ─── Export ──────────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    setIsExporting(true);
    const win = window.open('', '_blank');
    if (!win) { setIsExporting(false); return; }

    const activeModule = MODULES.find(m => m.id === activeTab);
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Rapport — ${activeModule?.label}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial; padding: 40px; color: #1a1a1a; font-size: 12px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7C3AED; }
        .logo { font-size: 24px; font-weight: 900; color: #7C3AED; }
        .title { font-size: 20px; font-weight: 900; text-align: right; }
        .sub { color: #6B7280; font-size: 11px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
        .stat-box { background: #F3F4F6; border-radius: 12px; padding: 16px; }
        .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; margin-bottom: 4px; }
        .stat-value { font-size: 18px; font-weight: 900; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        thead tr { background: #7C3AED; color: white; }
        th { padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 800; }
        td { padding: 9px 12px; border-bottom: 1px solid #F0F0F0; font-size: 11px; }
        tr:nth-child(even) td { background: #FAFAFA; }
        .footer { margin-top: 40px; text-align: center; color: #9CA3AF; font-size: 10px; }
        .in { color: #059669; font-weight: 700; }
        .out { color: #DC2626; font-weight: 700; }
        h2 { font-size: 14px; font-weight: 900; margin: 24px 0 12px; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
        @media print { @page { margin: 20mm; } }
      </style></head><body>
      <div class="header">
        <div>
          <div class="logo">ENTREPRISE</div>
          <div class="sub">Système de Gestion Financière</div>
        </div>
        <div>
          <div class="title">RAPPORT — ${activeModule?.label?.toUpperCase()}</div>
          <div class="sub" style="text-align:right">Généré le ${now} • Période: ${PERIOD_LABELS[period]}</div>
        </div>
      </div>

      <div class="grid">
        <div class="stat-box">
          <div class="stat-label">Total Entrées</div>
          <div class="stat-value in">+${fmt(stats.totalIn)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Sorties</div>
          <div class="stat-value out">-${fmt(stats.totalOut)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Solde de Période</div>
          <div class="stat-value">${fmt(stats.balance)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Solde Caisse</div>
          <div class="stat-value">${fmt(stats.totalCaisse)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Banques</div>
          <div class="stat-value">${fmt(stats.totalBank)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Dettes Restantes</div>
          <div class="stat-value out">${fmt(stats.totalDebts)}</div>
        </div>
      </div>

      <h2>Flux par Catégorie</h2>
      <table>
        <thead><tr><th>Catégorie</th><th>Nb transactions</th><th>Entrées</th><th>Sorties</th><th>Net</th></tr></thead>
        <tbody>
          ${stats.categoryData.map(r => `
            <tr>
              <td>${r.cat}</td>
              <td>${r.count}</td>
              <td class="in">${r.in > 0 ? '+' + fmt(r.in) : '—'}</td>
              <td class="out">${r.out > 0 ? '-' + fmt(r.out) : '—'}</td>
              <td style="font-weight:700">${fmt(r.in - r.out)}</td>
            </tr>`).join('')}
        </tbody>
      </table>

      <h2>Top Clients</h2>
      <table>
        <thead><tr><th>Client</th><th>Nb transactions</th><th>Volume</th></tr></thead>
        <tbody>
          ${stats.clientStats.slice(0, 8).map(c => `
            <tr><td>${c.name}</td><td>${c.txCount}</td><td class="in">${fmt(c.total)}</td></tr>`).join('')}
        </tbody>
      </table>

      <h2>Banques</h2>
      <table>
        <thead><tr><th>Banque</th><th>Solde actuel</th><th>Entrées période</th><th>Sorties période</th></tr></thead>
        <tbody>
          ${stats.bankStats.map(b => `
            <tr><td>${b.name}</td><td style="font-weight:700">${fmt(b.balance)}</td><td class="in">+${fmt(b.in)}</td><td class="out">-${fmt(b.out)}</td></tr>`).join('')}
        </tbody>
      </table>

      <div class="footer">Document généré numériquement · Système de Gestion SAF-Cash · ${now}</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); setIsExporting(false); }, 500);
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    const rows = [
      ['Date', 'Description', 'Catégorie', 'Source', 'Mode Paiement', 'Type', 'Montant (DA)', 'Statut'],
      ...filtered.map(t => [
        t.date, t.description, t.category, t.source === 'caisse' ? 'Caisse' : 'Banque',
        t.paymentMode || '', t.type === 'in' ? 'Entrée' : 'Sortie',
        t.type === 'in' ? t.amount : -t.amount, t.status || 'validé'
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rapport.csv'; a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  // ─── Tab Content Renderers ───────────────────────────────────────────────────

  const renderSituation = () => (
    <div className="space-y-8">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Solde Global" value={fmtShort(stats.totalCaisse + stats.totalBank) + ' DA'}
          sub="Caisse + Banques" icon={DollarSign} color="bg-violet-100 text-violet-600"
          trend={{ value: stats.profitMargin, positive: stats.profitMargin >= 0 }}
          onClick={() => setModalContent({
            title: 'Détail Solde Global',
            content: (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                  <span className="font-bold text-gray-700">Solde Caisse</span>
                  <span className="font-black text-emerald-700">{fmt(stats.totalCaisse)}</span>
                </div>
                {stats.bankStats.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <span className="font-bold text-gray-700">{b.name}</span>
                    <span className="font-black text-blue-700">{fmt(b.balance)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border-2 border-violet-200">
                  <span className="font-black text-gray-900">TOTAL</span>
                  <span className="font-black text-violet-700">{fmt(stats.totalCaisse + stats.totalBank)}</span>
                </div>
              </div>
            )
          })} delay={0} />
        <StatCard label="Entrées Période" value={fmtShort(stats.totalIn) + ' DA'}
          sub={`${stats.incomeCount} transactions`} icon={ArrowDownLeft} color="bg-emerald-100 text-emerald-600"
          onClick={() => setActiveTab('caisse')} delay={0.05} />
        <StatCard label="Sorties Période" value={fmtShort(stats.totalOut) + ' DA'}
          sub={`${stats.expenseCount} transactions`} icon={ArrowUpRight} color="bg-red-100 text-red-600"
          onClick={() => setActiveTab('achats')} delay={0.1} />
        <StatCard label="Dettes en Cours" value={fmtShort(stats.totalDebts) + ' DA'}
          sub={`${stats.debtCount} fournisseurs`} icon={AlertTriangle} color="bg-amber-100 text-amber-600"
          onClick={() => setActiveTab('achats')} delay={0.15} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Marge Nette" value={stats.profitMargin.toFixed(1) + '%'}
          sub="Entrées vs Sorties" icon={Percent} color="bg-indigo-100 text-indigo-600" delay={0.2} />
        <StatCard label="Nb Clients" value={String(clients.length)}
          sub={`${stats.activeClientsCount} actifs`} icon={Users} color="bg-rose-100 text-rose-600"
          onClick={() => setActiveTab('clients')} delay={0.25} />
        <StatCard label="Nb Fournisseurs" value={String(suppliers.length)}
          sub={`${stats.debtCount + stats.paidDebtCount} contrats`} icon={Truck} color="bg-orange-100 text-orange-600"
          onClick={() => setActiveTab('fournisseurs')} delay={0.3} />
        <StatCard label="Transferts Internes" value={String(stats.transferCount)}
          sub={fmtShort(stats.transferTotal) + ' DA'} icon={ArrowLeftRight} color="bg-cyan-100 text-cyan-600"
          onClick={() => setActiveTab('transferts')} delay={0.35} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-cyan-50/20 rounded-3xl p-8 border border-cyan-100/50 shadow-xl">
          <h4 className="text-xs font-bold text-cyan-700 uppercase tracking-widest pb-3 border-b border-cyan-200 mb-6">Tendance 6 Derniers Mois</h4>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.monthlyData}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.rose} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.rose} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#666' }} />
              <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 10, fill: '#999' }} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} />
              <Area type="monotone" dataKey="entrees" stroke={CHART_COLORS.emerald} fill="url(#gIn)" strokeWidth={2.5} name="Entrées" />
              <Area type="monotone" dataKey="sorties" stroke={CHART_COLORS.rose} fill="url(#gOut)" strokeWidth={2.5} name="Sorties" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS.emerald }} /><span className="text-xs font-bold text-gray-600">Entrées</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS.rose }} /><span className="text-xs font-bold text-gray-600">Sorties</span></div>
          </div>
        </div>

        {/* Pie chart - categories */}
        <div className="bg-gradient-to-br from-white to-cyan-50/20 rounded-3xl p-8 border border-cyan-100/50 shadow-xl">
          <h4 className="text-xs font-bold text-cyan-700 uppercase tracking-widest pb-3 border-b border-cyan-200 mb-6">Par Catégorie</h4>
          <ResponsiveContainer width="100%" height={180}>
            <RechartPie>
              <Pie data={stats.categoryData.slice(0, 6).map(c => ({ name: c.cat, value: c.in + c.out }))}
                cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {stats.categoryData.slice(0, 6).map((_, i) => (
                  <Cell key={i} fill={Object.values(CHART_COLORS)[i % 10]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(v)} />
            </RechartPie>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-4">
            {stats.categoryData.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: Object.values(CHART_COLORS)[i % 10] }} />
                  <span className="text-gray-600 font-medium truncate max-w-[120px]">{c.cat}</span>
                </div>
                <span className="font-bold text-gray-700">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <SectionHeader title="Détail par Catégorie" subtitle="Cliquer sur une ligne pour voir les transactions" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Catégorie</th>
                <th className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Nb</th>
                <th className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Entrées</th>
                <th className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-3">Sorties</th>
                <th className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest px-6 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {stats.categoryData.map((row, i) => (
                <motion.tr
                  key={i}
                  whileHover={{ backgroundColor: '#F9FAFB' }}
                  className="border-b border-gray-50 cursor-pointer"
                  onClick={() => setModalContent({
                    title: `Transactions — ${row.cat}`,
                    content: (
                      <div className="space-y-2">
                        {filtered.filter(t => t.category === row.cat).map((tx, j) => (
                          <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{tx.description || tx.category}</p>
                              <p className="text-xs text-gray-400">{tx.date} · {tx.source === 'caisse' ? 'Caisse' : 'Banque'}</p>
                            </div>
                            <span className={cn('font-black text-sm', tx.type === 'in' ? 'text-emerald-600' : 'text-red-500')}>
                              {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)}
                            </span>
                          </div>
                        ))}
                        {filtered.filter(t => t.category === row.cat).length === 0 && (
                          <p className="text-center text-gray-400 py-8">Aucune transaction pour cette catégorie dans la période sélectionnée</p>
                        )}
                      </div>
                    )
                  })}
                >
                  <td className="px-6 py-3.5">
                    <span className="text-sm font-bold text-gray-700">{row.cat}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-lg text-xs font-black text-gray-600">{row.count}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn('text-sm font-black', row.in > 0 ? 'text-emerald-600' : 'text-gray-300')}>
                      {row.in > 0 ? '+' + fmt(row.in) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn('text-sm font-black', row.out > 0 ? 'text-red-500' : 'text-gray-300')}>
                      {row.out > 0 ? '-' + fmt(row.out) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={cn('text-sm font-black', (row.in - row.out) >= 0 ? 'text-indigo-600' : 'text-red-600')}>
                      {fmt(row.in - row.out)}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {stats.categoryData.length === 0 && (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400 font-bold">Aucune transaction sur la période sélectionnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCaisse = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Solde Caisse" value={fmt(stats.totalCaisse)} icon={Wallet}
          color="bg-emerald-100 text-emerald-600"
          trend={{ value: ((stats.caisseIn - stats.caisseOut) / Math.max(stats.caisseIn, 1)) * 100, positive: stats.totalCaisse >= 0 }} />
        <StatCard label="Entrées Espèces" value={fmt(stats.caisseIn)} icon={ArrowDownLeft} color="bg-green-100 text-green-600" />
        <StatCard label="Sorties Espèces" value={fmt(stats.caisseOut)} icon={ArrowUpRight} color="bg-red-100 text-red-600" />
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h4 className="text-sm font-black text-gray-700 mb-6 uppercase tracking-widest">Flux Quotidien — 14 Derniers Jours</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
            <Bar dataKey="entrees" fill={CHART_COLORS.emerald} name="Entrées" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sorties" fill={CHART_COLORS.rose} name="Sorties" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <SectionHeader title="Transactions Caisse" />
        <div className="space-y-2">
          {filtered.filter(t => t.source === 'caisse').slice(0, 20).map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setModalContent({
                title: 'Détail Transaction',
                content: (
                  <div className="space-y-3">
                    {[
                      ['Description', tx.description], ['Catégorie', tx.category],
                      ['Date', tx.date], ['Source', tx.source === 'caisse' ? 'Caisse' : 'Banque'],
                      ['Mode Paiement', tx.paymentMode || '—'], ['Référence', tx.reference || '—'],
                      ['Statut', tx.status || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-xs font-bold text-gray-400 uppercase">{k}</span>
                        <span className="text-sm font-bold text-gray-800">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 bg-gray-50 rounded-xl px-4 mt-2">
                      <span className="font-black text-gray-700">Montant</span>
                      <span className={cn('font-black text-lg', tx.type === 'in' ? 'text-emerald-600' : 'text-red-600')}>
                        {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}>
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
                  tx.type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600')}>
                  {tx.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{tx.description || tx.category}</p>
                  <p className="text-xs text-gray-400">{tx.date} · {tx.category}</p>
                </div>
              </div>
              <span className={cn('text-sm font-black', tx.type === 'in' ? 'text-emerald-600' : 'text-red-500')}>
                {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)}
              </span>
            </div>
          ))}
          {filtered.filter(t => t.source === 'caisse').length === 0 && (
            <p className="text-center py-12 text-gray-400 font-bold">Aucune transaction caisse sur la période</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderBanque = () => (
    <div className="space-y-6">
      {/* Per bank */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.bankStats.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md"
            onClick={() => setModalContent({
              title: `Banque — ${b.name}`,
              content: (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[['Solde Actuel', fmt(b.balance), 'indigo'], ['Entrées', '+' + fmt(b.in), 'emerald'], ['Sorties', '-' + fmt(b.out), 'red']].map(([l, v, c]) => (
                      <div key={l} className={`p-3 bg-${c}-50 rounded-xl`}>
                        <p className={`text-xs font-bold text-${c}-600 mb-1`}>{l}</p>
                        <p className={`font-black text-${c}-700 text-sm`}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 mt-4">
                    {filtered.filter(t => t.bankId === b.id).slice(0, 10).map((tx, j) => (
                      <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{tx.description || tx.category}</p>
                          <p className="text-xs text-gray-400">{tx.date}</p>
                        </div>
                        <span className={cn('font-black text-sm', tx.type === 'in' ? 'text-emerald-600' : 'text-red-500')}>
                          {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Landmark size={18} className="text-blue-600" />
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{b.txCount} tx</span>
            </div>
            <p className="font-black text-gray-900 text-xl">{fmt(b.balance)}</p>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{b.name}</p>
            <div className="flex gap-3 mt-3">
              <span className="text-xs font-bold text-emerald-600">+{fmt(b.in)}</span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs font-bold text-red-500">-{fmt(b.out)}</span>
            </div>
          </motion.div>
        ))}
        {stats.bankStats.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400 font-bold">Aucune banque configurée</div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h4 className="text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">Transactions Bancaires</h4>
        <div className="space-y-2">
          {filtered.filter(t => t.source === 'bank').slice(0, 20).map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedBank(tx.bankId || 'all')}>
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
                  tx.type === 'in' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}>
                  {tx.type === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{tx.description || tx.category}</p>
                  <p className="text-xs text-gray-400">{tx.date} · {banks.find(b => b.id === tx.bankId)?.name || '—'} · {tx.paymentMode || '—'}</p>
                </div>
              </div>
              <span className={cn('text-sm font-black', tx.type === 'in' ? 'text-emerald-600' : 'text-red-500')}>
                {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={String(clients.length)} icon={Users} color="bg-rose-100 text-rose-600" />
        <StatCard label="Clients Actifs" value={String(stats.activeClientsCount)} icon={UserCheck} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Clients Inactifs" value={String(stats.inactiveClientsCount)} icon={Clock} color="bg-gray-100 text-gray-600" />
        <StatCard label="CA Clients" value={fmtShort(stats.totalIn) + ' DA'} icon={TrendingUp} color="bg-indigo-100 text-indigo-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <SectionHeader title="Top Clients par Volume" subtitle="Cliquer pour voir le détail" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['#', 'Client', 'Wilaya', 'Nb Transactions', 'Volume Total', 'Statut'].map(h => (
                <th key={h} className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.clientStats.map((c, i) => (
              <motion.tr key={c.id} whileHover={{ backgroundColor: '#FFF5F7' }}
                className="border-b border-gray-50 cursor-pointer"
                onClick={() => setModalContent({
                  title: `Client — ${c.name}`,
                  content: (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['Téléphone', c.phone || '—'], ['Email', c.email || '—'],
                          ['Wilaya', c.wilaya || '—'], ['NIF', c.taxId || '—'],
                          ['Limite Crédit', c.limitationCredit ? fmt(c.limitationCredit) : '—'],
                          ['Statut', c.status || 'actif'],
                        ].map(([k, v]) => (
                          <div key={k} className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs font-bold text-gray-400 mb-1">{k}</p>
                            <p className="font-bold text-gray-800">{v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-rose-50 rounded-xl">
                        <p className="text-xs font-bold text-rose-600 mb-1">Volume Total Achats</p>
                        <p className="font-black text-rose-700 text-xl">{fmt(c.total)}</p>
                      </div>
                    </div>
                  )
                })}>
                <td className="px-5 py-3.5 text-sm font-black text-gray-400">#{i + 1}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-xs">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-800 text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500">{c.wilaya || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-lg text-xs font-black text-gray-600">{c.txCount}</span>
                </td>
                <td className="px-5 py-3.5 text-sm font-black text-emerald-600">{c.total > 0 ? fmt(c.total) : '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                    c.status === 'actif' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'suspendu' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>
                    {c.status || 'actif'}
                  </span>
                </td>
              </motion.tr>
            ))}
            {stats.clientStats.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 font-bold">Aucun client enregistré</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFournisseurs = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Fournisseurs" value={String(suppliers.length)} icon={Truck} color="bg-orange-100 text-orange-600" />
        <StatCard label="Dettes Restantes" value={fmtShort(stats.totalDebts) + ' DA'} icon={AlertTriangle} color="bg-amber-100 text-amber-600" />
        <StatCard label="Dettes Payées" value={fmtShort(stats.totalDebtsPaid) + ' DA'} icon={CheckCircle} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Nb Dettes Actives" value={String(stats.debtCount)} icon={Hash} color="bg-red-100 text-red-600" />
      </div>

      {/* Debts progress */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <SectionHeader title="Suivi des Dettes Fournisseurs" />
        <div className="space-y-4">
          {debts.slice(0, 15).map((d, i) => {
            const sup = suppliers.find(s => s.id === d.supplierId);
            const pct = Math.min((d.paidAmount / Math.max(d.totalAmount, 1)) * 100, 100);
            const remaining = d.totalAmount - d.paidAmount;
            return (
              <motion.div key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-xl border border-gray-100 hover:border-orange-200 cursor-pointer transition-colors"
                onClick={() => setModalContent({
                  title: `Dette — ${sup?.name || 'Fournisseur inconnu'}`,
                  content: (
                    <div className="space-y-3">
                      {[
                        ['Fournisseur', sup?.name || '—'], ['N° Facture', d.invoiceNumber || '—'],
                        ['Date Facture', d.invoiceDate || '—'], ['Date', d.date],
                        ['Description', d.description || '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-xs font-bold text-gray-400 uppercase">{k}</span>
                          <span className="text-sm font-bold text-gray-800">{v}</span>
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-bold text-gray-400 mb-1">Total</p>
                          <p className="font-black text-gray-700">{fmt(d.totalAmount)}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl">
                          <p className="text-xs font-bold text-emerald-600 mb-1">Payé</p>
                          <p className="font-black text-emerald-700">{fmt(d.paidAmount)}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl">
                          <p className="text-xs font-bold text-red-600 mb-1">Restant</p>
                          <p className="font-black text-red-700">{fmt(remaining)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                      {sup?.name?.charAt(0) || '?'}
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{sup?.name || 'Fournisseur inconnu'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-600">{pct.toFixed(0)}%</span>
                    <span className={cn('text-xs font-bold', remaining > 0 ? 'text-red-500' : 'text-emerald-600')}>
                      {remaining > 0 ? '-' + fmt(remaining) : '✓ Soldé'}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                    className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">Total: {fmt(d.totalAmount)}</span>
                  <span className="text-xs text-gray-400">Payé: {fmt(d.paidAmount)}</span>
                </div>
              </motion.div>
            );
          })}
          {debts.length === 0 && <p className="text-center py-12 text-gray-400 font-bold">Aucune dette enregistrée</p>}
        </div>
      </div>
    </div>
  );

  const renderAchats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Achats" value={fmt(stats.totalOut)} icon={Package} color="bg-amber-100 text-amber-600" />
        <StatCard label="Dettes Restantes" value={fmt(stats.totalDebts)} icon={AlertTriangle} color="bg-red-100 text-red-600" />
        <StatCard label="Dettes Soldées" value={fmt(stats.totalDebtsPaid)} icon={CheckCircle} color="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <SectionHeader title="Top Fournisseurs par Volume d'Achat" />
        <div className="space-y-3">
          {stats.supplierStats.map((s, i) => {
            const maxTotal = Math.max(...stats.supplierStats.map(x => x.total), 1);
            return (
              <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setModalContent({
                  title: `Fournisseur — ${s.name}`,
                  content: (
                    <div className="space-y-3">
                      {[['Contact', s.contact || '—'], ['Téléphone', s.phone || '—'], ['Wilaya', s.wilaya || '—'], ['NIF', s.nif || '—']].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-xs font-bold text-gray-400 uppercase">{k}</span>
                          <span className="text-sm font-bold text-gray-800">{v}</span>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-4 bg-amber-50 rounded-xl">
                          <p className="text-xs font-bold text-amber-600 mb-1">Total Achats</p>
                          <p className="font-black text-amber-700">{fmt(s.total)}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl">
                          <p className="text-xs font-bold text-red-600 mb-1">Dette Restante</p>
                          <p className="font-black text-red-700">{fmt(s.debt)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-400 w-5">#{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-black text-xs">
                      {s.name.charAt(0)}
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{s.name}</span>
                  </div>
                  <span className="text-sm font-black text-amber-600">{fmt(s.total)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.total / maxTotal) * 100}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  />
                </div>
                {s.debt > 0 && <p className="text-xs text-red-500 font-bold mt-1">Dette: {fmt(s.debt)}</p>}
              </motion.div>
            );
          })}
          {stats.supplierStats.length === 0 && <p className="text-center py-12 text-gray-400 font-bold">Aucun achat enregistré</p>}
        </div>
      </div>
    </div>
  );

  const renderTransferts = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Nb Transferts" value={String(stats.transferCount)} icon={ArrowLeftRight} color="bg-cyan-100 text-cyan-600" />
        <StatCard label="Volume Total" value={fmt(stats.transferTotal)} icon={DollarSign} color="bg-blue-100 text-blue-600" />
        <StatCard label="Moy. par Transfert" value={stats.transferCount > 0 ? fmt(stats.transferTotal / stats.transferCount) : '—'} icon={Target} color="bg-indigo-100 text-indigo-600" />
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <SectionHeader title="Historique des Transferts Internes" />
        <div className="space-y-2">
          {filtered.filter(t => t.category === 'Transfert Interne').map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
                  <ArrowLeftRight size={16} className="text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{tx.description || 'Transfert Interne'}</p>
                  <p className="text-xs text-gray-400">{tx.date} · {tx.source === 'caisse' ? 'Caisse' : banks.find(b => b.id === tx.bankId)?.name || 'Banque'}</p>
                </div>
              </div>
              <span className="text-sm font-black text-cyan-600">{fmt(tx.amount)}</span>
            </div>
          ))}
          {filtered.filter(t => t.category === 'Transfert Interne').length === 0 && (
            <p className="text-center py-12 text-gray-400 font-bold">Aucun transfert sur la période</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bons de Commande', icon: FileText, color: 'bg-purple-100 text-purple-600', path: '/bon-commande' },
          { label: 'Bons de Livraison', icon: Truck, color: 'bg-blue-100 text-blue-600', path: '/bon-livraison' },
          { label: 'Bons de Réception', icon: Package, color: 'bg-emerald-100 text-emerald-600', path: '/bon-reception' },
          { label: 'Factures Proformat', icon: ReceiptText, color: 'bg-amber-100 text-amber-600', path: '/facture-proformat' },
        ].map((doc, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', doc.color)}>
              <doc.icon size={18} />
            </div>
            <p className="font-bold text-gray-700 text-sm">{doc.label}</p>
            <p className="text-xs text-gray-400 mt-1">Voir dans l'interface dédiée</p>
          </motion.div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
        <FileCheck size={40} className="mx-auto mb-4 text-purple-300" />
        <p className="font-bold text-gray-500 text-sm">Les statistiques détaillées des documents commerciaux</p>
        <p className="text-xs text-gray-400 mt-1">sont disponibles dans chaque section dédiée (BC, BL, BR, Factures)</p>
      </div>
    </div>
  );

  // ─── Tab Content Router ──────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'situation': return renderSituation();
      case 'caisse': return renderCaisse();
      case 'banque': return renderBanque();
      case 'ventes': return renderSituation(); // Could be extended
      case 'achats': return renderAchats();
      case 'clients': return renderClients();
      case 'fournisseurs': return renderFournisseurs();
      case 'transferts': return renderTransferts();
      case 'documents': return renderDocuments();
      default: return renderSituation();
    }
  };

  const activeModule = MODULES.find(m => m.id === activeTab);

  // Loading state - check after all hooks
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-violet-600/30 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
            Rapports & Analyses
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Intelligence financière & commerciale complète</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-600 via-blue-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-cyan-500/40 transition-all w-full md:w-auto"
        >
          <Printer size={20} />
          Exporter PDF
        </motion.button>
      </motion.div>

      {/* ── Top Filters Bar ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-white to-cyan-50/20 rounded-3xl border border-cyan-100/50 shadow-xl p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period */}
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600 pointer-events-none" />
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
              className="pl-10 pr-10 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
            >
              {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-600 pointer-events-none" />
          </div>

          {period === 'custom' && (
            <>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500" />
              <span className="text-cyan-400 text-sm font-bold">→</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500" />
            </>
          )}

          {/* Flux Type */}
          <select value={fluxType} onChange={e => setFluxType(e.target.value)}
            className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all">
            <option value="all">Tous les flux</option>
            <option value="cash">Caisse</option>
            <option value="bank">Banque</option>
            <option value="transfer">Transferts</option>
          </select>

          {/* Bank */}
          <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
            className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all">
            <option value="all">Toutes les banques</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Payment Mode */}
          <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
            className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all">
            <option value="all">Tous modes paiement</option>
            <option value="cash">Espèces</option>
            <option value="transfer">Virement</option>
            <option value="check">Chèque</option>
          </select>

          {/* Status */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all">
            <option value="all">Tous les statuts</option>
            <option value="validated">Validés</option>
            <option value="pending">En attente</option>
            <option value="rejected">Rejetés</option>
          </select>

          {/* Client */}
          {clients.length > 0 && (
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all">
              <option value="all">Tous clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Supplier */}
          {suppliers.length > 0 && (
            <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
              className="px-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold appearance-none cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all">
              <option value="all">Tous fournisseurs</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
            <input
              type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2.5 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 w-48 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-600 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Active filters count */}
          {(searchTerm || fluxType !== 'all' || selectedBank !== 'all' || selectedClient !== 'all' || selectedSupplier !== 'all' || statusFilter !== 'all' || paymentMode !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFluxType('all'); setSelectedBank('all'); setSelectedClient('all'); setSelectedSupplier('all'); setStatusFilter('all'); setPaymentMode('all'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all">
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cyan-100">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-600">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · {PERIOD_LABELS[period]}
            {dateRange.start && ` · Du ${dateRange.start}`}
            {dateRange.end && ` au ${dateRange.end}`}
          </span>
        </div>
      </motion.div>

      {/* ── Hero Stats (always visible) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cn('rounded-2xl p-6 text-white relative overflow-hidden bg-gradient-to-r', activeModule?.gradient || 'from-violet-600 to-indigo-600')}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white -ml-24 -mb-24" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <span className="text-xs font-black uppercase tracking-widest opacity-80">Rapport de Situation — {PERIOD_LABELS[period]}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Bilan Net', value: fmt(stats.balance), highlight: true },
              { label: 'Total Entrées', value: '+' + fmt(stats.totalIn) },
              { label: 'Total Sorties', value: '-' + fmt(stats.totalOut) },
              { label: 'Solde Total', value: fmt(stats.totalCaisse + stats.totalBank) },
              { label: 'Dettes', value: '-' + fmt(stats.totalDebts) },
            ].map((item, i) => (
              <div key={i} className={cn('p-3 rounded-xl border', item.highlight ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20')}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{item.label}</p>
                <p className={cn('font-black leading-tight', item.highlight ? 'text-xl' : 'text-sm')}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Module Tabs ── */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-2 min-w-max pb-2 bg-gradient-to-r from-cyan-50/50 via-blue-50/30 to-teal-50/50 rounded-2xl p-2">
          {MODULES.map((mod) => (
            <ModuleTab 
              key={mod.id} 
              module={mod} 
              active={activeTab === mod.id as ActiveTab}
              onClick={() => { setActiveTab(mod.id as ActiveTab); }}
            />
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}>
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* ── Report Footer ── */}
      <div className="text-center pt-8 pb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Rapport généré · {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {modalContent && (
          <DetailModal title={modalContent.title} onClose={() => setModalContent(null)}>
            {modalContent.content}
          </DetailModal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Rapports;