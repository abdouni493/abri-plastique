/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Search, Receipt, Wallet, 
  Trash2, Edit, X, Calendar, 
  ArrowUpRight, PieChart, Filter,
  Landmark, Printer, Upload, ExternalLink,
  ChevronRight, AlertCircle, TrendingDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { uploadJustificatif } from '../lib/storage';
import { formatAmount, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'Utilities', label: 'Services (Eau, Elec)', icon: '⚡' },
  { id: 'Fournitures', label: 'Fournitures', icon: '📦' },
  { id: 'Maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'Salaires', label: 'Salaires', icon: '👥' },
  { id: 'Loyer', label: 'Loyer', icon: '🏠' },
  { id: 'Transport', label: 'Transport', icon: '🚚' },
  { id: 'Autres', label: 'Autres', icon: '✨' },
];

const Depenses = () => {
  const { t, isRTL } = useLanguage();
  const { transactions, addTransaction, updateTransaction, deleteTransaction, loading, settings } = useApp();
  
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Utilities',
    date: new Date().toISOString().split('T')[0],
    description: '',
    source: 'caisse' as 'caisse' | 'bank',
    attachment: null as File | null,
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  const expenseTransactions = transactions.filter(t => [
    'Utilities', 'Fournitures', 'Maintenance', 
    'Salaires', 'Loyer', 'Transport', 'Autres'
  ].includes(t.category) || t.type === 'out');

  const filteredExpenses = expenseTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handlePrint = (expense: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bordereau de Dépense - ${expense.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Playfair+Display:wght@900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; padding: 30px; color: #1a1a1a; background: #fff; line-height: 1.4; }
            .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 24px; position: relative; overflow: hidden; }
            .receipt-container::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #dc2626, #db2777); }
            
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; gap: 20px; }
            .logo-section { display: flex; align-items: center; gap: 15px; }
            .logo-circle { width: 60px; height: 60px; background: linear-gradient(135deg, #dc2626 0%, #db2777 100%); border-radius: 15px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 24px; }
            .logo-circle img { width: 100%; height: 100%; object-fit: contain; }
            .company-info h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900; color: #1a1a1a; margin-bottom: 4px; }
            .company-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 10px; color: #64748b; }
            
            .doc-title { text-align: center; margin-bottom: 30px; }
            .doc-title h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #dc2626; margin-bottom: 5px; }
            .doc-title p { font-size: 11px; color: #94a3b8; font-weight: 600; }

            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { padding: 15px; background: #f8fafc; border-radius: 16px; border: 1px solid #f1f5f9; }
            .info-box label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 6px; }
            .info-box .value { font-size: 14px; font-weight: 700; color: #1e293b; }

            .main-content { background: #fff; border: 2px solid #f1f5f9; border-radius: 20px; padding: 25px; margin-bottom: 30px; }
            .desc-row { margin-bottom: 20px; }
            .desc-row .value { font-size: 16px; font-weight: 600; color: #334155; line-height: 1.6; }

            .amount-section { background: #1e293b; color: #fff; padding: 25px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; }
            .amount-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
            .amount-value { font-size: 28px; font-weight: 900; font-family: 'Playfair Display', serif; }

            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 50px; padding-top: 30px; border-top: 2px dashed #f1f5f9; }
            .sign-box { text-align: center; }
            .sign-line { height: 60px; border-bottom: 1px solid #cbd5e1; margin-bottom: 10px; }
            .sign-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }

            .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="logo-section">
                <div class="logo-circle">
                  ${settings?.logo ? `<img src="${settings.logo}">` : 'AP'}
                </div>
                <div class="company-info">
                  <h2>${settings?.name || 'ABRI PLASTIQUE'}</h2>
                  <div class="company-details">
                    <span>${settings?.address || 'Alger, Algérie'}</span>
                    <span>${settings?.phone || '0799047248'}</span>
                  </div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: 900; color: #dc2626;">#EXP-${expense.id.slice(0, 8).toUpperCase()}</div>
                <div style="font-size: 10px; font-weight: 600; color: #94a3b8; margin-top: 4px;">Émis le ${expense.date}</div>
              </div>
            </div>

            <div class="doc-title">
              <h1>Bordereau de Sortie Caisse</h1>
              <p>Justificatif de dépense opérationnelle</p>
            </div>

            <div class="details-grid">
              <div class="info-box">
                <label>Catégorie</label>
                <div class="value">${expense.category}</div>
              </div>
              <div class="info-box">
                <label>Mode de Paiement</label>
                <div class="value" style="text-transform: uppercase;">${expense.source === 'caisse' ? 'Caisse Espèces' : 'Virement Bancaire'}</div>
              </div>
            </div>

            <div class="main-content">
              <div class="desc-row">
                <label style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 10px;">Désignation / Motif</label>
                <div class="value">${expense.description}</div>
              </div>
            </div>

            <div class="amount-section">
              <span class="amount-label">Montant Total</span>
              <span class="amount-value">${new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(expense.amount)} DA</span>
            </div>

            <div class="signatures">
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-label">Le Bénéficiaire</div>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-label">Comptabilité</div>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-label">La Direction</div>
              </div>
            </div>

            <div class="footer">
              <p>Document généré par SAF-Cash • ${new Date().toLocaleTimeString()} • ${settings?.nif || 'NIF: Numéro d\'Identification Fiscale'}</p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      description: expense.description,
      source: expense.source,
      attachment: null,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let proofUrl: string | undefined;
    if (formData.attachment) {
      proofUrl = await uploadJustificatif(formData.attachment, 'depenses') || undefined;
    }
    
    const data = {
      amount: parseFloat(formData.amount),
      type: 'out' as const,
      category: formData.category,
      date: formData.date,
      description: formData.description,
      source: formData.source,
      status: 'validated' as const,
      proof: proofUrl,
    };

    if (editingExpense) {
      await updateTransaction(editingExpense.id, data);
    } else {
      await addTransaction(data);
    }

    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      amount: '', category: 'Utilities', 
      date: new Date().toISOString().split('T')[0],
      description: '', source: 'caisse',
      attachment: null,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 bg-clip-text text-transparent">
            Dépenses
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Gérez les dépenses opérationnelles de votre entreprise</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingExpense(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-red-500/40 transition-all"
        >
          <Plus size={20} />
          Nouvelle Dépense
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
           <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-inner">
                <TrendingDown size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black opacity-75 uppercase tracking-widest mb-1">Total Dépenses</p>
                <h3 className="text-3xl font-black">{formatAmount(totalExpenses)}</h3>
              </div>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 border border-red-100 shadow-xl flex items-center gap-5 hover:border-red-200 transition-colors">
           <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <PieChart size={28} />
           </div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume</p>
              <h3 className="text-3xl font-black text-gray-900">{expenseTransactions.length}</h3>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xl flex items-center gap-5 hover:border-emerald-200 transition-colors">
           <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <AlertCircle size={28} />
           </div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Moyenne / Opération</p>
              <h3 className="text-3xl font-black text-gray-900">
                {expenseTransactions.length ? formatAmount(totalExpenses / expenseTransactions.length) : '0 DA'}
              </h3>
           </div>
        </motion.div>
      </div>

      {/* Registry Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
             <h3 className="text-xl font-bold text-gray-900 tracking-tight">Registre des Dépenses</h3>
             <p className="text-xs text-gray-500 font-semibold mt-0.5">Historique complet des sorties de caisse et banque</p>
           </div>
           <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Rechercher une dépense..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl py-2 ps-10 pe-4 text-xs font-bold w-full md:w-64 shadow-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all" 
                />
              </div>
              <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold shadow-sm outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
              >
                <option value="all">Toutes Catégories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
             <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Désignation</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Catégorie</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Source</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">Montant</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filteredExpenses.map((item) => (
                 <tr key={item.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('fr-DZ')}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-black text-gray-900 line-clamp-1">{item.description}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">REF: {item.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                         {item.category}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-2">
                          <div className={cn(
                             "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
                             item.source === 'caisse' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                          )}>
                             {item.source === 'caisse' ? <Wallet size={14}/> : <Landmark size={14}/>}
                          </div>
                          <span className="text-[10px] font-black text-gray-600 uppercase">{item.source === 'caisse' ? 'Caisse' : 'Banque'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-sm font-black text-red-600">-{formatAmount(item.amount)}</span>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.proof && (
                            <a href={item.proof} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-red-100 rounded-xl text-red-600 transition-all" title="Voir Justificatif"><ExternalLink size={16}/></a>
                          )}
                          <button onClick={() => handleEdit(item)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-all" title="Modifier"><Edit size={16}/></button>
                          <button onClick={() => deleteTransaction(item.id)} className="p-2 hover:bg-red-100 rounded-xl text-red-600 transition-all" title="Supprimer"><Trash2 size={16}/></button>
                          <button onClick={() => handlePrint(item)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-900 transition-all"><Printer size={16}/></button>
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
          {filteredExpenses.length === 0 && (
            <div className="p-20 text-center">
               <Receipt size={64} className="mx-auto text-gray-200 mb-4" />
               <p className="text-gray-400 font-bold italic">Aucune dépense trouvée</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Expense Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-red-50/30">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                     <Receipt size={24} className="text-red-600" />
                     {editingExpense ? 'Modifier Dépense' : 'Nouvelle Dépense'}
                   </h3>
                   <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-xl shadow-sm text-gray-400 transition-colors"><X size={20}/></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Désignation / Motif</label>
                      <input required type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 font-bold text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all" placeholder="Ex: Facture Electricité Mars" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Montant (DA)</label>
                        <input required type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 font-black text-xl text-red-600 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Date</label>
                        <div className="relative">
                          <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 font-bold text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all" />
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Catégorie</label>
                        <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 font-bold text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all cursor-pointer">
                           {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ps-1">Source de paiement</label>
                        <div className="flex bg-gray-100 p-1 rounded-2xl">
                           <button type="button" onClick={() => setFormData({...formData, source: 'caisse'})} className={cn("flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all", formData.source === 'caisse' ? "bg-white text-amber-600 shadow-md" : "text-gray-500")}>Caisse</button>
                           <button type="button" onClick={() => setFormData({...formData, source: 'bank'})} className={cn("flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all", formData.source === 'bank' ? "bg-white text-indigo-600 shadow-md" : "text-gray-500")}>Banque</button>
                        </div>
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ps-1">Justificatif (Image/PDF)</label>
                      <label className="flex items-center gap-4 border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:text-red-500 group-hover:bg-red-100 transition-all">
                          <Upload size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-600 group-hover:text-red-700 transition-colors">
                            {formData.attachment ? formData.attachment.name : 'Choisir un fichier...'}
                          </p>
                          <p className="text-[10px] font-semibold text-gray-400">Taille max: 5MB</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*,application/pdf" 
                          onChange={(e) => setFormData({...formData, attachment: e.target.files?.[0] || null})} />
                      </label>
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-colors uppercase tracking-widest text-xs">Annuler</button>
                      <button type="submit" className="flex-[2] bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white rounded-2xl py-4 px-8 font-black text-sm shadow-lg hover:shadow-red-500/40 transition-all active:scale-[0.98] uppercase tracking-widest">
                        {editingExpense ? 'Modifier Dépense' : 'Valider Dépense'}
                      </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Depenses;
