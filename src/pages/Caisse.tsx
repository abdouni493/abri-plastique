/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  MoreHorizontal, FileText, Printer, Edit, Trash2, 
  X, Upload, PieChart, Landmark, Info, CheckCircle2, History, Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { formatAmount, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { uploadJustificatif, downloadImage } from '../lib/storage';

const Caisse = () => {
  const { t, isRTL } = useLanguage();
  const { transactions, addTransaction, updateTransaction, deleteTransaction, divisions, clients, suppliers, loading, settings } = useApp();
  
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null>(null);

  const caisseTransactions = transactions.filter(t => t.source === 'caisse');
  const totalIn = caisseTransactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = caisseTransactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
  const totalCaisse = totalIn - totalOut;

  const [formData, setFormData] = useState({
    amount: '',
    type: 'in' as 'in' | 'out',
    category: 'Vente Marchandise',
    date: new Date().toISOString().split('T')[0],
    description: '',
    attachment: null as any,
    clientId: '',
    supplierId: '',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setCurrentProofUrl(transaction.proof || null);
    setFormData({
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      description: transaction.description,
      attachment: null,
      clientId: transaction.clientId || '',
      supplierId: transaction.supplierId || '',
    });
    setUploadError(null);
    setUploadedFileName(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingFile(true);
    setUploadError(null);
    
    try {
      let proofUrl: string | null = currentProofUrl || null;
      
      // If new file uploaded, use that instead
      if (formData.attachment) {
        proofUrl = await uploadJustificatif(formData.attachment, 'caisse');
        if (!proofUrl) {
          setUploadError('Erreur lors du téléchargement du justificatif. Veuillez réessayer.');
          setUploadingFile(false);
          return;
        }
      }
      
      const data = {
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        date: formData.date,
        description: formData.description,
        source: 'caisse' as const,
        status: 'validated' as const,
        clientId: formData.clientId || undefined,
        supplierId: formData.supplierId || undefined,
        proof: proofUrl || undefined,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
      } else {
        await addTransaction(data);
      }

      setShowModal(false);
      setEditingTransaction(null);
      setUploadingFile(false);
      setUploadError(null);
      setUploadedFileName(null);
      setCurrentProofUrl(null);
      setFormData({
        amount: '',
        type: 'in',
        category: 'Vente Marchandise',
        date: new Date().toISOString().split('T')[0],
        description: '',
        attachment: null,
        clientId: '',
        supplierId: '',
      });
    } catch (err) {
      console.error('Error submitting transaction:', err);
      setUploadError('Erreur lors de la création de la transaction. Veuillez réessayer.');
      setUploadingFile(false);
    }
  };

  const handlePrint = (transaction: any) => {
    const printWindow = window.open('', '_self');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('fr-DZ');
    const operationType = transaction.type === 'in' ? 'ENTRÉE' : 'SORTIE';
    const operationColor = transaction.type === 'in' ? '#10b981' : '#ef4444';

    const html = `
      <!DOCTYPE html>
      <html dir="ltr" lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reçu de Caisse - ${transaction.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;900&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            @page {
              size: A4;
              margin: 10mm;
            }
            
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #fff;
              color: #1a1a1a;
              line-height: 1.5;
              font-size: 13px;
            }
            
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              background: #fff;
              padding: 20px;
            }
            
            .company-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 15px;
              margin-bottom: 18px;
              gap: 15px;
            }
            
            .company-logo {
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-weight: 900;
              font-size: 24px;
              box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
              flex-shrink: 0;
            }
            
            .company-info {
              flex: 1;
            }
            
            .company-name {
              font-family: 'Playfair Display', serif;
              font-size: 20px;
              font-weight: 900;
              color: #1a1a1a;
              margin-bottom: 5px;
              letter-spacing: -0.5px;
            }
            
            .company-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              font-size: 11px;
              color: #666;
            }
            
            .company-details div {
              display: flex;
              flex-direction: column;
              gap: 1px;
            }
            
            .company-details label {
              font-weight: 600;
              text-transform: uppercase;
              font-size: 8px;
              color: #999;
              letter-spacing: 0.3px;
            }
            
            .company-details span {
              font-weight: 500;
              color: #333;
              font-size: 11px;
            }
            
            .document-title {
              text-align: center;
              margin-bottom: 18px;
              padding: 12px;
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              border-radius: 8px;
              border-left: 3px solid #4f46e5;
            }
            
            .document-title h1 {
              font-family: 'Playfair Display', serif;
              font-size: 18px;
              font-weight: 900;
              color: #1a1a1a;
              margin-bottom: 3px;
              letter-spacing: -0.5px;
            }
            
            .document-title p {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }
            
            .details-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 15px;
              padding: 12px;
              background: #f9fafb;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            
            .detail-group {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            
            .detail-label {
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              color: #999;
              letter-spacing: 0.3px;
            }
            
            .detail-value {
              font-size: 12px;
              font-weight: 600;
              color: #1a1a1a;
            }
            
            .detail-value.id {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              color: #4f46e5;
              background: #eef2ff;
              padding: 4px 8px;
              border-radius: 4px;
              display: inline-block;
              width: fit-content;
            }
            
            .description-section {
              margin-bottom: 15px;
              padding: 12px;
              background: #f0f9ff;
              border-left: 3px solid #0ea5e9;
              border-radius: 6px;
            }
            
            .description-section .detail-label {
              color: #0284c7;
            }
            
            .description-section .detail-value {
              margin-top: 4px;
              line-height: 1.4;
              font-size: 12px;
              font-weight: 500;
            }
            
            .amount-section {
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: #fff;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 18px;
              box-shadow: 0 4px 15px rgba(79, 70, 229, 0.15);
            }
            
            .amount-section .detail-label {
              color: rgba(255, 255, 255, 0.9);
              margin-bottom: 6px;
              font-size: 9px;
            }
            
            .amount-value {
              font-family: 'Playfair Display', serif;
              font-size: 32px;
              font-weight: 900;
              margin-bottom: 8px;
              letter-spacing: -1px;
            }
            
            .operation-type {
              display: inline-block;
              padding: 5px 12px;
              background: rgba(255, 255, 255, 0.25);
              border-radius: 4px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1.5px solid #e5e7eb;
            }
            
            .signature-box {
              text-align: center;
            }
            
            .signature-space {
              min-height: 50px;
              border-bottom: 1.5px solid #1a1a1a;
              margin-bottom: 4px;
            }
            
            .signature-label {
              font-size: 9px;
              font-weight: 600;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              line-height: 1.3;
            }
            
            .footer-section {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 9px;
              color: #999;
            }
            
            .footer-section p {
              margin: 2px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="company-header">
              <div class="company-logo">
                ${settings.logo ? `<img src="${settings.logo}" style="width: 100%; height: 100%; object-fit: contain;">` : 'CO'}
              </div>
              <div class="company-info">
                <div class="company-name">${settings.name || 'ABRI PLASTIQUE'}</div>
                <div class="company-details">
                  <div>
                    <label>Telephone</label>
                    <span>${settings.phone || '0799047248'}</span>
                  </div>
                  <div>
                    <label>Adresse</label>
                    <span>${settings.address || 'Adresse complete'}</span>
                  </div>
                  <div>
                    <label>Ville</label>
                    <span>${settings.city || 'Alger'}</span>
                  </div>
                  <div>
                    <label>RIP Bancaire</label>
                    <span>${settings.rip || '00000 00000 0000000000 00'}</span>
                  </div>
                  <div>
                    <label>NIF (Fiscal)</label>
                    <span>${settings.nif || 'Numéro d\'Identification Fiscale'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="document-title">
              <h1>Recu d'Operation</h1>
              <p>Bon de Caisse - Numero: #${transaction.id.toUpperCase()}</p>
            </div>
            
            <div class="details-section">
              <div class="detail-group">
                <span class="detail-label">Date Operation</span>
                <span class="detail-value">${transaction.date}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Reference</span>
                <span class="detail-value id">#${transaction.id.toUpperCase()}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Categorie</span>
                <span class="detail-value">${transaction.category}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Impression</span>
                <span class="detail-value">${currentDate}</span>
              </div>
            </div>
            
            <div class="description-section">
              <div class="detail-label">Description / Motif</div>
              <div class="detail-value">${transaction.description || 'N/A'}</div>
            </div>
            
            <div class="amount-section">
              <div class="detail-label">Montant de l'Operation</div>
              <div class="amount-value">${formatAmount(transaction.amount)} DA</div>
              <div class="operation-type" style="background-color: rgba(${operationColor === '#10b981' ? '16, 185, 129' : '239, 68, 68'}, 0.3); color: ${operationColor};">
                ${operationType}
              </div>
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-space"></div>
                <div class="signature-label">Signature<br>Responsable Caisse</div>
              </div>
              <div class="signature-box">
                <div class="signature-space"></div>
                <div class="signature-label">Cachet & Visa<br>Direction</div>
              </div>
              <div class="signature-box">
                <div class="signature-space"></div>
                <div class="signature-label">Signature<br>Client/Tiers</div>
              </div>
            </div>
            
            <div class="footer-section">
              <p>Recu genere le ${currentDate}</p>
              <p>SAF-Cash - Systeme de Gestion des Caisses</p>
              <p style="margin-top: 3px;">Ce document est confidentiel et destine a usage interne uniquement.</p>
            </div>
          </div>
          
          <script>
            let printHandled = false;
            
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 100);
            });
            
            window.addEventListener('beforeprint', function() {
              printHandled = false;
            });
            
            window.addEventListener('afterprint', function() {
              if (!printHandled) {
                printHandled = true;
                window.location.href = window.location.href;
              }
            });
            
            window.addEventListener('keydown', function(e) {
              if (e.key === 'Escape') {
                window.location.href = window.location.href;
              }
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredTransactions = caisseTransactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('caisse')}</h1>
          <p className="text-gray-600 font-semibold mt-1">Gérez votre argent liquide en temps réel</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/40 transition-all w-full md:w-auto"
        >
          <Plus size={20} />
          {t('new_transaction')}
        </motion.button>
      </motion.div>

      {/* Main Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl hover:shadow-2xl hover:shadow-indigo-500/40 transition-all"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between items-start mb-8">
               <div>
                  <div className="flex items-center gap-2 opacity-90 mb-3">
                    <div className="w-2 h-2 rounded-full bg-white/60"></div>
                    <span className="text-xs font-bold uppercase tracking-widest leading-none">{t('total_balance')}</span>
                  </div>
                  <h2 className="text-6xl md:text-7xl font-black tracking-tight">{formatAmount(totalCaisse)}</h2>
               </div>
               <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  onClick={() => setShowModal(true)}
                  className="bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white hover:shadow-2xl hover:shadow-indigo-500/40 rounded-3xl p-5 transition-all font-bold"
               >
                  <Plus size={32} />
               </motion.button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="px-6 py-4 bg-white/15 backdrop-blur-lg rounded-2xl flex items-center gap-3 border border-white/20">
                <div className="w-10 h-10 rounded-xl bg-emerald-400/30 text-emerald-200 flex items-center justify-center">
                  <ArrowDownLeft size={20} />
                </div>
                <div>
                   <p className="text-[11px] font-bold opacity-75 uppercase leading-none mb-1.5">{t('in')}</p>
                   <p className="text-lg font-bold">{formatAmount(totalIn)}</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-white/15 backdrop-blur-lg rounded-2xl flex items-center gap-3 border border-white/20">
                <div className="w-10 h-10 rounded-xl bg-red-400/30 text-red-200 flex items-center justify-center">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                   <p className="text-[11px] font-bold opacity-75 uppercase leading-none mb-1.5">{t('out')}</p>
                   <p className="text-lg font-bold">{formatAmount(totalOut)}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Divisions Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl p-8 border border-indigo-100/50 shadow-xl backdrop-blur"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center">
              <PieChart size={18} />
            </div>
            Divisions de Caisse
          </h3>
          <div className="space-y-6">
            {divisions.length > 0 ? divisions.map((div, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm font-bold text-gray-700">
                  <span>{div.name}</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{div.percentage}%</span>
                </div>
                <div className="h-2.5 w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-full overflow-hidden shadow-sm">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${div.percentage}%` }}
                    transition={{ delay: 0.3 + idx * 0.05, duration: 1 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
                  ></motion.div>
                </div>
                <p className="text-[10px] font-bold text-gray-500 text-end tracking-wider">
                  SOLDE: {formatAmount(totalCaisse * (div.percentage / 100))}
                </p>
              </motion.div>
            )) : (
              <p className="text-sm text-gray-400 italic text-center py-8">Aucune division configurée</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white to-indigo-50/20 rounded-3xl border border-indigo-100/50 shadow-xl overflow-hidden backdrop-blur"
      >
        <div className="p-6 md:p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h3 className="text-xl font-bold text-gray-900">Mouvements de Caisse</h3>
           <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl py-2 ps-10 pe-4 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all w-full md:w-64 text-sm font-medium shadow-sm"
                />
              </div>
              <button className="p-2.5 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all">
                <Filter size={18} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/30 to-purple-50/30 border-b border-indigo-100/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">{t('date')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">{t('description')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">{t('category')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-start">{t('amount')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100/30">
              {filteredTransactions.map((item, idx) => (
                <tr 
                  key={item.id}
                  className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-600 font-mono">{item.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{item.description}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">#{item.id.toUpperCase()}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={cn(
                      "flex items-center gap-2 font-extrabold text-sm",
                      item.type === 'in' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {item.type === 'in' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                      <span className={item.type === 'in' ? "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent" : "bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent"}>
                        {formatAmount(item.amount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-end whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                       <motion.button
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => setShowViewModal(item)}
                         className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                         title="Voir"
                       >
                          <Info size={16} />
                       </motion.button>
                       <motion.button
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => handleEdit(item)}
                         className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                         title="Modifier"
                       >
                          <Edit size={16} />
                       </motion.button>
                       <motion.button
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => handlePrint(item)}
                         className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                         title="Imprimer"
                       >
                          <Printer size={16} />
                       </motion.button>
                       <motion.button
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => {
                           if(window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
                             deleteTransaction(item.id);
                           }
                         }}
                         className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                         title="Supprimer"
                       >
                          <Trash2 size={16} />
                       </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
               <FileText className="mx-auto text-gray-200 mb-4" size={48} />
               <p className="text-gray-400 font-medium italic">Aucun mouvement trouvé</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal Transaction */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowModal(false);
                setEditingTransaction(null);
                setUploadError(null);
                setUploadedFileName(null);
                setCurrentProofUrl(null);
                setFormData({
                  amount: '',
                  type: 'in',
                  category: 'Vente Marchandise',
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  attachment: null,
                  clientId: '',
                  supplierId: '',
                });
              }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -40 }}
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
            >
               <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">{t('new_transaction')}</h3>
                  <button 
                    onClick={() => {
                      setShowModal(false);
                      setEditingTransaction(null);
                      setUploadError(null);
                      setUploadedFileName(null);
                      setCurrentProofUrl(null);
                      setFormData({
                        amount: '',
                        type: 'in',
                        category: 'Vente Marchandise',
                        date: new Date().toISOString().split('T')[0],
                        description: '',
                        attachment: null,
                        clientId: '',
                        supplierId: '',
                      });
                    }}
                    className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"
                  >
                    <X size={24}/>
                  </button>
               </div>

               <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="flex bg-gray-100 p-1 rounded-[1.5rem] gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, type: 'in'})}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest",
                        formData.type === 'in' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <ArrowDownLeft size={20} />
                      {t('in')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, type: 'out'})}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest",
                        formData.type === 'out' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <ArrowUpRight size={20} />
                      {t('out')}
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">{t('amount')} (DA)</label>
                      <input 
                        required
                        type="number" 
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className={cn(
                          "w-full bg-gray-50 border border-gray-200 rounded-[2rem] py-6 px-8 focus:border-indigo-600 outline-none transition-all font-black text-4xl text-center shadow-inner",
                          formData.type === 'in' ? "text-emerald-600" : "text-red-500"
                        )}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2 flex flex-col">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">{t('category')}</label>
                          <select 
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600 appearance-none scrollbar-hide"
                          >
                             <option>Vente Marchandise</option>
                             <option>Prestation Service</option>
                             <option>Approvisionnement</option>
                             <option>Autres</option>
                          </select>
                       </div>
                       <div className="space-y-2 flex flex-col">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">{t('date')}</label>
                          <input 
                            type="date" 
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                          />
                       </div>
                    </div>

                    {formData.category === 'Approvisionnement' && (
                      <div className="space-y-2 flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">{t('supplier')}</label>
                        <select 
                          value={formData.supplierId || ''}
                          onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 font-bold text-sm outline-none focus:border-indigo-600"
                        >
                          <option value="">Sélectionner un fournisseur...</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="space-y-2 flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">{t('description')}</label>
                        <input 
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 font-medium text-sm outline-none focus:border-indigo-600"
                          placeholder="Détails de l'opération..."
                        />
                      </div>
  
                      <div className="space-y-2 flex flex-col">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1">Justificatif</label>
                         
                         {currentProofUrl && (
                           <div className="space-y-3">
                             <div className="relative rounded-2xl overflow-hidden border border-indigo-200 bg-indigo-50">
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
                             <p className="text-xs text-indigo-600 font-bold">Image actuelle - Cliquez sur X pour la supprimer</p>
                           </div>
                         )}
                         
                         <label className={cn(
                           "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center gap-2 hover:border-indigo-400 cursor-pointer transition-colors group",
                           currentProofUrl ? "border-gray-200" : "border-gray-200"
                         )}>
                            <Upload className="text-gray-400 group-hover:text-indigo-600 transition-colors" size={32} />
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
                                  setFormData({...formData, attachment: e.target.files[0]});
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
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-4 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingTransaction(null);
                        setUploadError(null);
                        setUploadedFileName(null);
                        setCurrentProofUrl(null);
                        setFormData({
                          amount: '',
                          type: 'in',
                          category: 'Vente Marchandise',
                          date: new Date().toISOString().split('T')[0],
                          description: '',
                          attachment: null,
                          clientId: '',
                          supplierId: '',
                        });
                      }}
                      className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-colors text-xs uppercase tracking-[0.2em]"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      type="submit"
                      disabled={uploadingFile}
                      className="flex-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white rounded-2xl py-4 px-8 font-black text-xs uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {uploadingFile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Upload...
                        </>
                      ) : (
                        t('save')
                      )}
                    </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {showViewModal && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewModal(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -40 }}
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
            >
               <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">Détails de l'opération</h3>
                  <button 
                    onClick={() => setShowViewModal(null)}
                    className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"
                  >
                    <X size={24}/>
                  </button>
               </div>

               <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                  {/* Amount Card */}
                  <div className="text-center bg-gradient-to-br from-indigo-50 to-purple-50 py-10 rounded-[2.5rem] border border-indigo-100 shadow-sm">
                     <div className={cn(
                       "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm",
                       showViewModal.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                     )}>
                        {showViewModal.type === 'in' ? <ArrowDownLeft size={32} /> : <ArrowUpRight size={32} />}
                     </div>
                     <p className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">{formatAmount(showViewModal.amount)}</p>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{showViewModal.type === 'in' ? 'ENCAISSEMENT' : 'DÉCAISSEMENT'}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1 mb-2">Date</p>
                           <p className="font-bold text-gray-900 bg-gray-50 p-4 rounded-2xl border border-gray-200">{showViewModal.date}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1 mb-2">Catégorie</p>
                           <p className="font-bold text-gray-900 bg-gray-50 p-4 rounded-2xl border border-gray-200">{showViewModal.category}</p>
                        </div>
                     </div>

                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1 mb-2">Description</p>
                        <p className="text-sm font-medium text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-200 leading-relaxed">
                          {showViewModal.description || 'Aucune description fournie.'}
                        </p>
                     </div>

                     {showViewModal.proof && (
                       <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ps-1 mb-3">Justificatif</p>
                          <img 
                            src={showViewModal.proof} 
                            className="w-full rounded-2xl border border-indigo-200 shadow-sm object-cover max-h-96" 
                            alt="Justificatif" 
                          />
                       </div>
                     )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4 shrink-0">
                    {showViewModal.proof && (
                      <button 
                        onClick={async () => {
                          try {
                            await downloadImage(showViewModal.proof, `justificatif-${showViewModal.id}.jpg`);
                          } catch (err) {
                            console.error('Error downloading image:', err);
                            alert('Erreur lors du téléchargement de l\'image');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-2xl py-4 font-black transition-all text-xs uppercase tracking-[0.2em]"
                      >
                        <Download size={18} />
                        Télécharger l'image
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        handleEdit(showViewModal);
                        setShowViewModal(null);
                      }}
                      className="w-full flex items-center justify-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-2xl py-4 font-black transition-all text-xs uppercase tracking-[0.2em]"
                    >
                      <Edit size={18} />
                      Modifier
                    </button>
                    <button 
                      onClick={() => handlePrint(showViewModal)}
                      className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl py-4 font-black transition-all shadow-lg text-xs uppercase tracking-[0.2em]"
                    >
                      <Printer size={18} />
                      Imprimer Reçu
                    </button>
                    <button 
                      onClick={() => setShowViewModal(null)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl py-4 font-black transition-all text-xs uppercase tracking-[0.2em]"
                    >
                      Fermer
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Caisse;
