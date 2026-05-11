/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, Landmark, 
  AlertTriangle, ArrowUpRight, ArrowDownLeft, Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { formatAmount } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const Dashboard = () => {
  const { t, isRTL } = useLanguage();
  const { transactions, banks, loading, settings, appointments, clients, suppliers } = useApp();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  const totalCaisse = transactions
    .filter(t => t.source === 'caisse')
    .reduce((acc, t) => acc + (t.type === 'in' ? t.amount : -t.amount), 0);

  const totalBank = banks.reduce((acc, b) => acc + b.balance, 0);
  
  const stats = [
    { label: t('total_balance'), value: totalCaisse + totalBank, icon: Wallet, color: 'indigo' },
    { label: t('caisse'), value: totalCaisse, icon: ArrowDownLeft, color: 'emerald' },
    { label: t('bank'), value: totalBank, icon: Landmark, color: 'blue' },
  ];

  const recentTransactions = transactions.slice(0, 5);

  // Build weekly data from real database transactions
  const chartData = (() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
    const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    // Calculate the start of the current week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekData: { [key: string]: { in: number; out: number } } = {};
    
    // Initialize data for each day of the week
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayName = daysOfWeek[(i + 1) % 7]; // Monday to Sunday
      weekData[dayName] = { in: 0, out: 0 };
    }
    
    // Aggregate transactions by day of week
    transactions.forEach((tx) => {
      if (tx.date) {
        const txDate = new Date(tx.date);
        const txDayOfWeek = txDate.getDay();
        const dayName = daysOfWeek[(txDayOfWeek === 0 ? 0 : txDayOfWeek)];
        
        // Only include transactions from the current week
        if (txDate >= startOfWeek && txDate <= now) {
          if (tx.type === 'in') {
            weekData[dayName].in += tx.amount || 0;
          } else {
            weekData[dayName].out += tx.amount || 0;
          }
        }
      }
    });
    
    // Convert to chart format (Monday to Sunday)
    return daysOfWeek.slice(1).map(day => ({
      name: day,
      in: Math.round(weekData[day].in),
      out: Math.round(weekData[day].out)
    })).concat([{
      name: 'Dim',
      in: Math.round(weekData['Dim'].in),
      out: Math.round(weekData['Dim'].out)
    }]);
  })();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('dashboard')}</h1>
          <p className="text-gray-500 font-semibold mt-1">{t('stats')}</p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-3"
        >
           <div className="bg-gradient-to-r from-white to-emerald-50/30 px-6 py-3 rounded-2xl shadow-lg border border-emerald-100/50 flex items-center gap-3 backdrop-blur">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-widest leading-none">Système Live</span>
           </div>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -8 }}
            className={`relative overflow-hidden rounded-3xl p-6 border shadow-xl transition-all cursor-pointer group
              ${idx === 0 ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-500 text-white border-indigo-400/30' : ''}
              ${idx === 1 ? 'bg-gradient-to-br from-emerald-50 to-cyan-50 text-gray-900 border-emerald-200' : ''}
              ${idx === 2 ? 'bg-gradient-to-br from-cyan-50 to-blue-50 text-gray-900 border-cyan-200' : ''}
            `}
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${idx === 0 ? 'text-white/80' : 'text-gray-500'}`}>{stat.label}</p>
                <h3 className={`text-3xl font-extrabold ${idx === 0 ? 'text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
                  {formatAmount(stat.value)}
                </h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110
                ${idx === 0 ? 'bg-white/20 text-white' : ''}
                ${idx === 1 ? 'bg-emerald-200 text-emerald-600' : ''}
                ${idx === 2 ? 'bg-cyan-200 text-cyan-600' : ''}
              `}>
                <stat.icon size={28} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-gradient-to-br from-white to-indigo-50/30 p-8 rounded-3xl shadow-xl border border-indigo-100/30 backdrop-blur"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Activité Hebdomadaire</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <span className="text-xs font-bold text-gray-600 uppercase">{t('in')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500"></div>
                <span className="text-xs font-bold text-gray-600 uppercase">{t('out')}</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(102,126,234,0.1)" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(102,126,234,0.2)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
                  />
                  <Area type="monotone" dataKey="in" stroke="#667eea" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
                  <Area type="monotone" dataKey="out" stroke="#f87171" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Alerts & Recent Activity */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl shadow-xl border border-amber-100/50 backdrop-blur"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <AlertTriangle className="text-white" size={18} />
              </div>
              {t('alerts')}
            </h3>
            <div className="space-y-3">
              {totalCaisse < settings.lowCashAlertThreshold && (
                <div className="p-4 bg-white/60 border border-amber-200/50 rounded-2xl flex items-start gap-3 backdrop-blur">
                  <AlertTriangle className="text-amber-600 mt-1 shrink-0" size={16} />
                  <p className="text-sm font-semibold text-amber-900">Caisse basse ! Le solde est inférieur au seuil de {formatAmount(settings.lowCashAlertThreshold)}.</p>
                </div>
              )}
              {appointments
                .filter(a => a.status === 'pending' && a.date === new Date().toISOString().split('T')[0])
                .map(a => {
                  const client = clients.find(c => c.id === a.client_id);
                  const supplier = suppliers.find(s => s.id === a.supplier_id);
                  const name = client?.name || supplier?.name || 'Inconnu';
                  return (
                    <div key={a.id} className="p-4 bg-white/60 border border-amber-200/50 rounded-2xl flex items-start gap-3 backdrop-blur">
                      <Clock className="text-orange-600 mt-1 shrink-0" size={16} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Rendez-vous à {a.hour}</p>
                        <p className="text-xs font-semibold text-orange-700">{a.type === 'percevoir' ? 'Prendre' : 'Donner'} {formatAmount(a.amount)} - {name}</p>
                      </div>
                    </div>
                  );
                })
              }
              {totalCaisse >= settings.lowCashAlertThreshold && appointments.filter(a => a.status === 'pending' && a.date === new Date().toISOString().split('T')[0]).length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">Aucune alerte importante</p>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-white to-purple-50/30 p-6 rounded-3xl shadow-xl border border-purple-100/30 backdrop-blur"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">{t('recent_transactions')}</h3>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? recentTransactions.map((t, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="flex items-center justify-between px-1 py-2 hover:bg-gray-50/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${t.type === 'in' ? 'bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-600' : 'bg-gradient-to-br from-red-100 to-pink-100 text-red-600'}`}>
                      {t.type === 'in' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{t.description}</p>
                      <p className="text-[10px] font-semibold text-gray-400 font-mono tracking-tighter">{t.date}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-extrabold bg-gradient-to-r ${t.type === 'in' ? 'from-emerald-600 to-green-600 bg-clip-text text-transparent' : 'from-red-600 to-pink-600 bg-clip-text text-transparent'}`}>
                    {t.type === 'in' ? '+' : '-'}{formatAmount(t.amount)}
                  </p>
                </motion.div>
              )) : (
                <p className="text-center text-gray-400 py-4 font-semibold italic text-sm">Aucune transaction</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
