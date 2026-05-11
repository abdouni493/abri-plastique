/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unified Payment Modal Component
 * Used for both Client and Supplier debt payments
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, CreditCard, Printer, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  entityType: 'client' | 'supplier';
  debt: any;
  entityName: string;
  onClose: () => void;
  onPaid: () => void;
}

export function UnifiedPaymentModal({
  entityType,
  debt,
  entityName,
  onClose,
  onPaid,
}: PaymentModalProps) {
  const [payAmount, setPayAmount] = useState<string>(
    String(Math.max(0, debt.total_amount - debt.paid_amount))
  );
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reste = Math.max(0, debt.total_amount - debt.paid_amount);
  const amountNum = Math.min(Number(payAmount) || 0, reste);
  const newPaid = debt.paid_amount + amountNum;
  const newReste = Math.max(0, debt.total_amount - newPaid);

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA';

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <html><head><title>Reçu de Paiement</title></head>
      <body style="font-family:Arial;padding:40px;max-width:600px;margin:0 auto;">
      <style>
        .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; }
        .row.total { border-bottom:2px solid #333; font-weight:bold; padding:12px 0; }
        .label { color:#666; }
        .val { font-weight:bold; }
      </style>
      <h1>Reçu de Paiement</h1>
      <p style="color:#666;margin-bottom:24px;">
        Facture: <strong>${debt.invoice_number}</strong> · 
        ${entityType === 'client' ? 'Client' : 'Fournisseur'}: <strong>${entityName}</strong>
      </p>
      <div class="row"><span class="label">Montant Total</span><span class="val">${fmt(debt.total_amount)}</span></div>
      <div class="row"><span class="label">Déjà Payé</span><span class="val">${fmt(debt.paid_amount)}</span></div>
      <div class="row"><span class="label">Ce Paiement</span><span class="val" style="color:#ef4444;">${fmt(amountNum)}</span></div>
      <div class="row total"><span>Nouveau Solde Restant</span><span>${fmt(newReste)}</span></div>
      <p style="margin-top:40px;color:#999;font-size:11px;">Imprimé le ${new Date().toLocaleDateString('fr-DZ')}</p>
      <script>window.onload=()=>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleSave = async () => {
    if (amountNum <= 0) {
      setError('Montant invalide');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (entityType === 'client') {
        // Insert client debt payment
        await supabase.from('client_debt_payments').insert({
          debt_id: debt.id,
          amount: amountNum,
          payment_mode: 'especes',
          date: new Date().toISOString().split('T')[0],
          notes: payNote || undefined,
        });
      } else {
        // Insert supplier debt payment
        await supabase.from('debt_payments').insert({
          debt_id: debt.id,
          amount: amountNum,
          payment_mode: 'especes',
          date: new Date().toISOString().split('T')[0],
          notes: payNote || undefined,
        });
      }

      onPaid();
      onClose();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSaving(false);
    }
  };

  const bgColor = entityType === 'client' ? 'from-rose-600 via-pink-600 to-red-600' : 'from-emerald-600 via-teal-600 to-green-600';
  const inputBorderColor = entityType === 'client' ? 'border-rose-400 focus:ring-rose-500' : 'border-emerald-400 focus:ring-emerald-500';
  const inputTextColor = entityType === 'client' ? 'text-rose-700' : 'text-emerald-700';
  const bgSummary = entityType === 'client' ? 'bg-rose-50/60 border-rose-100' : 'bg-emerald-50/60 border-emerald-100';
  const buttonBg = entityType === 'client' ? 'from-rose-600 to-pink-600' : 'from-emerald-600 to-teal-600';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${bgColor} px-8 py-6 flex items-center justify-between`}>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <CreditCard size={20} />
              Payer la Dette
            </h2>
            <p className="text-white/80 text-xs font-semibold mt-0.5">
              {debt.invoice_number} · {entityName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/10 rounded-xl p-2"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-7 space-y-4">
          {/* Invoice Summary */}
          <div className={`rounded-2xl border ${bgSummary} p-4 space-y-2`}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Total Facture</span>
              <span className="font-black text-gray-900">{fmt(debt.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-semibold">Déjà Payé</span>
              <span className={`font-black ${entityType === 'client' ? 'text-rose-700' : 'text-emerald-700'}`}>
                {fmt(debt.paid_amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2" style={{
              borderTopColor: entityType === 'client' ? '#fee2e2' : '#d1fae5'
            }}>
              <span className="text-gray-700 font-bold">Reste à Payer</span>
              <span className="font-black text-red-700 text-base">{fmt(reste)}</span>
            </div>
          </div>

          {/* Payment input */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Montant à payer maintenant
            </label>
            <input
              type="number"
              min="0"
              max={reste}
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              className={`w-full border-2 ${inputBorderColor} rounded-xl py-3 px-4 text-lg font-black ${inputTextColor} focus:ring-4 focus:ring-opacity-20 outline-none text-right`}
            />
          </div>

          {/* Result preview */}
          {amountNum > 0 && (
            <div
              className={`rounded-xl p-4 border-2 ${
                newReste <= 0
                  ? entityType === 'client'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              <div className="flex justify-between text-sm font-bold">
                <span>Nouveau solde restant:</span>
                <span className="text-lg">{fmt(newReste)}</span>
              </div>
              {newReste <= 0 && (
                <p className="text-xs font-bold mt-1">✅ Facture soldée intégralement!</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Note (optionnel)
            </label>
            <input
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              placeholder="Ex: Virement, chèque n°..."
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-4 focus:ring-opacity-20 outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">
              {error}
            </div>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-none flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all"
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || amountNum <= 0}
            className={`flex-1 py-3 rounded-xl bg-gradient-to-br ${buttonBg} text-white font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {saving ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
