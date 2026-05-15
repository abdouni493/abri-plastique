/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Search, Filter, ArrowRight, ArrowLeftRight, 
  Landmark, Wallet, Calendar, FileText, Printer, 
  Edit, Trash2, X, Upload, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { formatAmount, cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const Transfert = () => {
  const { hasPermission } = useAuth();
  const { t, isRTL } = useLanguage();
  const { transactions, banks, addTransaction, updateTransaction, deleteTransaction, loading, settings } = useApp();
  
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<any>(null);
  const [editingTransfer, setEditingTransfer] = useState<any>(null);

  const transferTransactions = transactions.filter(t => t.category === 'Transfert Interne');

  const [formData, setFormData] = useState({
    amount: '',
    direction: 'caisse_to_bank' as 'caisse_to_bank' | 'bank_to_caisse',
    bankId: banks[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const handleEdit = (transfer: any) => {
    setEditingTransfer(transfer);
    setFormData({
      amount: transfer.amount.toString(),
      direction: transfer.source === 'caisse' ? 'caisse_to_bank' : 'bank_to_caisse',
      bankId: transfer.bankId || '',
      date: transfer.date,
      description: transfer.description || '',
    });
    setShowModal(true);
  };

  const handlePrint = (transaction: any) => {
    const printWindow = window.open('', '_self');
    if (!printWindow) return;

    const bank = banks.find(b => b.id === transaction.bankId);
    const directionText = transaction.source === 'caisse' ? 'Caisse vers Banque' : 'Banque vers Caisse';
    const currentDate = new Date().toLocaleDateString('fr-DZ');
    const originText = transaction.source === 'caisse' ? 'CAISSE CENTRALE' : bank?.name;
    const destinationText = transaction.source === 'caisse' ? bank?.name : 'CAISSE CENTRALE';

    const html = `
      <!DOCTYPE html>
      <html dir="ltr" lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bordereau de Transfert - ${transaction.id}</title>
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
              border-bottom: 2px solid #8b5cf6;
              padding-bottom: 15px;
              margin-bottom: 18px;
              gap: 15px;
            }
            
            .company-logo {
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-weight: 900;
              font-size: 24px;
              box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
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
              background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
              border-radius: 8px;
              border-left: 3px solid #8b5cf6;
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
              background: #faf5ff;
              border-radius: 8px;
              border: 1px solid #e9d5ff;
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
              color: #9333ea;
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
              color: #8b5cf6;
              background: #f3e8ff;
              padding: 4px 8px;
              border-radius: 4px;
              display: inline-block;
              width: fit-content;
            }
            
            .transfer-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 15px;
            }
            
            .transfer-box {
              padding: 12px;
              background: #faf5ff;
              border-radius: 8px;
              border: 1px solid #e9d5ff;
            }
            
            .transfer-box .detail-label {
              color: #9333ea;
            }
            
            .transfer-arrow {
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              color: #8b5cf6;
              font-weight: 700;
            }
            
            .description-section {
              margin-bottom: 15px;
              padding: 12px;
              background: #faf5ff;
              border-left: 3px solid #8b5cf6;
              border-radius: 6px;
            }
            
            .description-section .detail-label {
              color: #9333ea;
            }
            
            .description-section .detail-value {
              margin-top: 4px;
              line-height: 1.4;
              font-size: 12px;
              font-weight: 500;
            }
            
            .amount-section {
              background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
              color: #fff;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 18px;
              box-shadow: 0 4px 15px rgba(139, 92, 246, 0.15);
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
                ${settings.logo ? `<img src="${settings.logo}" style="width: 100%; height: 100%; object-fit: contain;">` : 'TR'}
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
                  ${settings.nif ? `
                  <div>
                    <label>NIF (Fiscal)</label>
                    <span>${settings.nif}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <div class="document-title">
              <h1>Bordereau de Transfert</h1>
              <p>Numero: #${transaction.id.toUpperCase()}</p>
            </div>
            
            <div class="details-section">
              <div class="detail-group">
                <span class="detail-label">Date Transfert</span>
                <span class="detail-value">${transaction.date}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Reference</span>
                <span class="detail-value id">#TR-${transaction.id.toUpperCase()}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Impression</span>
                <span class="detail-value">${currentDate}</span>
              </div>
              <div class="detail-group">
                <span class="detail-label">Direction</span>
                <span class="detail-value">${directionText}</span>
              </div>
            </div>
            
            <div class="transfer-info">
              <div class="transfer-box">
                <div class="detail-label">Origine des Fonds</div>
                <div class="detail-value">${originText}</div>
              </div>
              <div class="transfer-box">
                <div class="detail-label">Destination des Fonds</div>
                <div class="detail-value">${destinationText}</div>
              </div>
            </div>
            
            <div class="description-section">
              <div class="detail-label">Motif du Transfert</div>
              <div class="detail-value">${transaction.description || 'Alimentation de compte / Caisse'}</div>
            </div>
            
            <div class="amount-section">
              <div class="detail-label">Montant du Transfert</div>
              <div class="amount-value">${formatAmount(transaction.amount)} DA</div>
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-space"></div>
                <div class="signature-label">Signature<br>Caissier</div>
              </div>
              <div class="signature-box">
                <div class="signature-space"></div>
                <div class="signature-label">Visas Banque<br>& Direction</div>
              </div>
              <div class="signature-box">
                <div class="signature-space"></div>
                <div class="signature-label">Cachet<br>Entreprise</div>
              </div>
            </div>
            
            <div class="footer-section">
              <p>Bordereau genere le ${currentDate}</p>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    const isToBank = formData.direction === 'caisse_to_bank';
    
    // Create double entry simulation
    if (formData.direction === 'caisse_to_bank') {
      // Out from Caisse
      await addTransaction({
        amount: amountNum,
        type: 'out',
        category: 'Transfert Interne',
        date: formData.date,
        description: `Dépôt vers ${banks.find(b => b.id === formData.bankId)?.name}: ${formData.description}`,
        source: 'caisse',
        status: 'validated'
      });
      // In to Bank
      await addTransaction({
        amount: amountNum,
        type: 'in',
        category: 'Transfert Interne',
        date: formData.date,
        description: `Dépôt espèces: ${formData.description}`,
        source: 'bank',
        bankId: formData.bankId,
        status: 'validated'
      });
    } else {
      // Out from Bank
      await addTransaction({
        amount: amountNum,
        type: 'out',
        category: 'Transfert Interne',
        date: formData.date,
        description: `Retrait vers Caisse: ${formData.description}`,
        source: 'bank',
        bankId: formData.bankId,
        status: 'validated'
      });
      // In to Caisse
      await addTransaction({
        amount: amountNum,
        type: 'in',
        category: 'Transfert Interne',
        date: formData.date,
        description: `Retrait depuis ${banks.find(b => b.id === formData.bankId)?.name}: ${formData.description}`,
        source: 'caisse',
        status: 'validated'
      });
    }

    // Update bank balance
    if (formData.bankId) {
      const bank = banks.find(b => b.id === formData.bankId);
      if (bank) {
        const newBalance = isToBank ? bank.balance + amountNum : bank.balance - amountNum;
        await supabase.from('banks').update({ balance: newBalance }).eq('id', formData.bankId);
      }
    }

    setShowModal(false);
    setFormData({ ...formData, amount: '', description: '' });
  };

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
            {t('transfer')}
          </h1>
          <p className="text-gray-600 font-semibold mt-1">Mouvements de fonds internes entre caisse et comptes bancaires</p>
        </div>
        {hasPermission('action_create') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/40 transition-all w-full md:w-auto"
          >
            <Plus size={20} />
            Nouveau Transfert
          </motion.button>
        )}
      </motion.div>

      {/* Info Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl border border-amber-200 shadow-sm"
        >
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                 <Wallet size={24} />
              </div>
              <div>
                 <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Caisse vers Banque</p>
                 <p className="text-sm text-amber-700 font-medium mt-2">Déposer des espèces sur un compte bancaire pour sécuriser vos fonds.</p>
              </div>
           </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-200 shadow-sm"
        >
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                 <Landmark size={24} />
              </div>
              <div>
                 <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Banque vers Caisse</p>
                 <p className="text-sm text-indigo-700 font-medium mt-2">Retirer des fonds pour alimenter la caisse et gérer les dépenses courantes.</p>
              </div>
           </div>
        </motion.div>
      </motion.div>

      {/* History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-white to-indigo-50/20 rounded-3xl border border-indigo-100/50 shadow-xl overflow-hidden"
      >
        <div className="p-6 md:p-8 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 flex items-center justify-between">
           <h3 className="text-xl font-bold text-gray-900">Historique des Mouvements</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-b border-indigo-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Mouvement</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100/50">
              {transferTransactions.map((item) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50/50 transition-all"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-gray-500 font-mono flex items-center gap-2">
                       <Calendar size={14} />
                       {item.date}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          item.source === 'caisse' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                        )}>
                           {item.source === 'caisse' ? <Wallet size={16}/> : <Landmark size={16}/>}
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          item.source === 'caisse' ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                        )}>
                           {item.source === 'caisse' ? <Landmark size={16}/> : <Wallet size={16}/>}
                        </div>
                        <p className="text-sm font-bold text-gray-900 ms-2">{item.description}</p>
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-sm text-indigo-600">{formatAmount(item.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                       <motion.button
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => setShowViewModal(item)}
                         className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                         title="Voir les détails"
                       >
                          <Info size={16} />
                       </motion.button>
                       {hasPermission('action_edit') && (
                         <motion.button
                           whileHover={{ scale: 1.1 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => handleEdit(item)}
                           className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                           title="Modifier"
                         >
                            <Edit size={16} />
                         </motion.button>
                       )}
                       {hasPermission('action_delete') && (
                         <motion.button
                           whileHover={{ scale: 1.1 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => {
                             if(window.confirm('Confirmer la suppression ?')) {
                               const paired = transactions.find(t => 
                                 t.id !== item.id &&
                                 t.category === 'Transfert Interne' &&
                                 t.amount === item.amount &&
                                 t.date === item.date
                               );
                               deleteTransaction(item.id);
                               if (paired) deleteTransaction(paired.id);
                             }
                           }}
                           className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                           title="Supprimer"
                         >
                            <Trash2 size={16} />
                         </motion.button>
                       )}
                       {hasPermission('action_print') && (
                         <motion.button
                           whileHover={{ scale: 1.1 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => handlePrint(item)}
                           className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                           title="Imprimer"
                         >
                            <Printer size={16} />
                         </motion.button>
                       )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {transferTransactions.length === 0 && (
            <div className="p-20 text-center">
               <ArrowLeftRight className="mx-auto text-gray-200 mb-4" size={48} />
               <p className="text-gray-500 font-semibold">Aucun transfert effectué</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal Transfert */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start pt-4 m-0 md:pt-10 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -40 }}
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
            >
               <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">Nouveau Transfert</h3>
                  <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors group"><X size={24} className="group-hover:rotate-90 transition-transform"/></button>
               </div>

               <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar italic font-sans normal-case">
                  <div className="space-y-3 flex flex-col">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ps-2">Montant du Transfert (DA)</label>
                      <input 
                        required
                        type="number" 
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-[2.5rem] py-8 px-10 focus:border-indigo-600 outline-none transition-all font-black text-5xl text-center shadow-inner text-indigo-600 tracking-tighter"
                        placeholder="0.00"
                      />
                  </div>

                  <div className="space-y-4 flex flex-col">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ps-2">Direction du Flux</label>
                     <div className="flex bg-gray-100 p-1.5 rounded-[2rem] gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, direction: 'caisse_to_bank'})}
                          className={cn(
                            "flex-1 py-5 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] shadow-sm",
                            formData.direction === 'caisse_to_bank' ? "bg-white text-indigo-600 scale-100" : "text-gray-400 hover:text-gray-600 scale-95"
                          )}
                        >
                           <Wallet size={20} />
                           Caisse → Banque
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, direction: 'bank_to_caisse'})}
                          className={cn(
                            "flex-1 py-5 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] shadow-sm",
                            formData.direction === 'bank_to_caisse' ? "bg-white text-indigo-600 scale-100" : "text-gray-400 hover:text-gray-600 scale-95"
                          )}
                        >
                           <Landmark size={20} />
                           Banque → Caisse
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3 flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ps-2">
                           {formData.direction === 'caisse_to_bank' ? 'Banque de destination' : 'Compte source'}
                        </label>
                        <select 
                           required
                           value={formData.bankId}
                           onChange={(e) => setFormData({...formData, bankId: e.target.value})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 font-black text-sm outline-none focus:border-indigo-600 appearance-none shadow-sm"
                        >
                           {banks.map(b => (
                             <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="space-y-3 flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ps-2">{t('date')}</label>
                        <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 font-black text-sm outline-none focus:border-indigo-600 shadow-sm" />
                     </div>
                  </div>

                  <div className="space-y-3 flex flex-col font-sans normal-case">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ps-2">Commentaire / Justification</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-[2rem] py-5 px-8 font-bold text-sm outline-none focus:border-indigo-600 min-h-[120px] shadow-inner italic"
                      placeholder="Indiquez le motif de ce transfert interne..."
                    />
                  </div>

                  <div className="flex flex-col md:flex-row gap-5 pt-4 shrink-0 font-sans uppercase">
                    <button 
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-5 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-colors text-[10px] tracking-[0.3em]"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      type="submit"
                      className="flex-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 text-white rounded-2xl py-5 px-10 font-black text-[10px] tracking-[0.3em] hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-[0.98] transition-all shadow-xl"
                    >
                      Valider le Transfert
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowViewModal(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden font-sans italic">
               <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50/20">
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight italic">Flux de trésorerie interne</h3>
                  <button onClick={() => setShowViewModal(null)} className="p-3 hover:bg-white rounded-2xl shadow-sm text-gray-400 transition-all hover:rotate-90"><X size={20}/></button>
               </div>
               <div className="p-10 space-y-10">
                  <div className="flex flex-col items-center gap-10">
                     <div className="flex items-center gap-8 group">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm transition-transform group-hover:-translate-x-2">
                           {showViewModal.source === 'caisse' ? <Wallet size={32}/> : <Landmark size={32}/>}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <ArrowRight size={24} className="text-indigo-400 group-hover:scale-125 transition-transform" />
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">INTERNE</span>
                        </div>
                        <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm transition-transform group-hover:translate-x-2">
                           {showViewModal.source === 'caisse' ? <Landmark size={32}/> : <Wallet size={32}/>}
                        </div>
                     </div>
                     <div className="text-center italic">
                        <p className="text-5xl font-black text-gray-900 mb-2 tracking-tighter">{formatAmount(showViewModal.amount)}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-sans">{showViewModal.source === 'caisse' ? 'Dépôt sur Compte Bancaire' : 'Alimentation de Caisse'}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-10 gap-x-8 px-2 border-t border-gray-50 pt-10 font-sans italic">
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 ps-1">Date du flux</p>
                        <p className="text-base font-black text-gray-900">{showViewModal.date}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 ps-1">Banque Concérnée</p>
                        <p className="text-base font-black text-indigo-600 uppercase tracking-tight">
                          {banks.find(b => b.id === showViewModal.bankId)?.name || 'Opération Caisse Pure'}
                        </p>
                     </div>
                     <div className="col-span-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 ps-1">Justification du mouvement</p>
                        <p className="text-sm font-bold text-gray-600 bg-gray-50 p-6 rounded-[2rem] italic leading-relaxed border border-gray-100 normal-case">
                          {showViewModal.description || 'Ce transfert interne a été effectué sans commentaire additionnel.'}
                        </p>
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-5 pt-6 uppercase font-sans">
                     <button onClick={() => handlePrint(showViewModal)} className="flex-1 bg-gray-900 text-white rounded-2xl py-5 font-black flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95 text-[10px] tracking-widest">
                        <Printer size={20} /> {t('print')}
                     </button>
                     <button onClick={() => setShowViewModal(null)} className="flex-1 bg-gray-100 text-gray-400 rounded-2xl py-5 font-black hover:bg-gray-200 transition-all text-[10px] tracking-widest">Fermer</button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Transfert;
