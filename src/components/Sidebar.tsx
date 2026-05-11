/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Landmark, ArrowLeftRight, 
  ShoppingBag, ShoppingCart, Users, Truck, Receipt, 
  UserCircle, FileText, Settings, LogOut, Menu, X,
  Package, Wrench, FileCheck, File, Clipboard,
  ChevronRight, Circle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) => {
  const { t, isRTL } = useLanguage();
  const { user, logout, hasPermission } = useAuth();
  const { settings } = useApp();
  const location = useLocation();
  const [mode, setMode] = useState<'caisse' | 'commercial'>('caisse');

  const caisseMenuItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard'), permission: 'view_dashboard' },
    { path: '/caisse', icon: Wallet, label: t('caisse'), permission: 'view_caisse' },
    { path: '/banque', icon: Landmark, label: t('bank'), permission: 'view_bank' },
    { path: '/transfert', icon: ArrowLeftRight, label: t('transfer'), permission: 'view_transfer' },
    { path: '/ventes', icon: ShoppingBag, label: t('sales'), permission: 'view_sales' },
    { path: '/achats', icon: ShoppingCart, label: t('purchases'), permission: 'view_purchases' },
    { path: '/clients', icon: Users, label: t('clients'), permission: 'view_clients' },
    { path: '/fournisseurs', icon: Truck, label: t('suppliers'), permission: 'view_suppliers' },
    { path: '/depenses', icon: Receipt, label: t('expenses'), permission: 'view_expenses' },
    { path: '/utilisateurs', icon: UserCircle, label: t('users'), permission: 'view_users' },
    { path: '/rapports', icon: FileText, label: t('reports'), permission: 'view_reports' },
    { path: '/parametres', icon: Settings, label: t('settings'), permission: 'view_settings' },
  ];

  const commercialMenuItems = [
    { path: '/commercial/dashboard', icon: LayoutDashboard, label: 'Dashboard Commercial', permission: 'view_dashboard' },
    { path: '/stockage', icon: Package, label: 'Stockage', permission: 'view_dashboard' },
    { path: '/production', icon: Wrench, label: 'Production', permission: 'view_dashboard' },
    { path: '/achats', icon: ShoppingCart, label: t('purchases'), permission: 'view_purchases' },
    { path: '/ventes', icon: ShoppingBag, label: t('sales'), permission: 'view_sales' },
    { path: '/fournisseurs', icon: Truck, label: t('suppliers'), permission: 'view_suppliers' },
    { path: '/clients', icon: Users, label: t('clients'), permission: 'view_clients' },
    { path: '/bon-commande', icon: Clipboard, label: 'Bon de Commande', permission: 'view_dashboard' },
    { path: '/bon-livraison', icon: FileCheck, label: 'Bon de Livraison', permission: 'view_dashboard' },
    { path: '/bon-reception', icon: File, label: 'Bon de Réception', permission: 'view_dashboard' },
    { path: '/facture-proformat', icon: FileText, label: 'Facture Proformat', permission: 'view_dashboard' },
    { path: '/utilisateurs', icon: UserCircle, label: t('users'), permission: 'view_users' },
    { path: '/depenses', icon: Receipt, label: t('expenses'), permission: 'view_expenses' },
    { path: '/inventaire', icon: Package, label: 'Inventaire', permission: 'view_dashboard' },
    { path: '/rapports', icon: FileText, label: t('reports'), permission: 'view_reports' },
    { path: '/parametres', icon: Settings, label: t('settings'), permission: 'view_settings' },
  ];

  const menuItems = mode === 'caisse' ? caisseMenuItems : commercialMenuItems;
  const filteredItems = menuItems.filter(item => hasPermission(item.permission));

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 300 : 0,
          x: isRTL ? (isOpen ? 0 : 300) : (isOpen ? 0 : -300)
        }}
        className={cn(
          "fixed top-0 bottom-0 z-50 bg-[#FDFDFF] border-e border-slate-100 overflow-hidden lg:static lg:block shadow-[0_0_40px_rgba(0,0,0,0.03)] lg:shadow-none",
          isRTL ? "right-0" : "left-0"
        )}
      >
        <div className="flex flex-col h-full w-[300px]">
          {/* Logo Section */}
          <div className="h-24 flex items-center px-8 shrink-0 bg-white/50 backdrop-blur-md">
            <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(79,70,229,0.15)] overflow-hidden border-2 border-white bg-white">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 flex items-center justify-center">
                  <span className="text-white font-black text-2xl">{settings.name?.[0] || 'E'}</span>
                </div>
              )}
            </div>
            <div className="ms-4 overflow-hidden">
              <h1 className="text-xl font-black text-slate-900 truncate tracking-tight leading-none">
                {settings.name || 'ABRI PLASTIQUE'}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="relative flex items-center">
                  <Circle size={6} className="text-emerald-500 fill-emerald-500" />
                  <Circle size={10} className="text-emerald-500/30 fill-emerald-500/30 absolute animate-ping" />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Connecté</p>
              </div>
            </div>
          </div>

          {/* User Profile Snippet */}
          <div className="mx-6 my-4 p-4 rounded-[1.5rem] bg-gradient-to-br from-slate-50 to-white border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-[0_4px_12px_rgba(79,70,229,0.3)] border-2 border-white/20">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user?.name || 'Administrateur'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                   <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{user?.role || 'Admin'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="px-6 py-2 shrink-0">
            <div className="bg-slate-100/50 p-1 rounded-[1.25rem] flex gap-1 w-full border border-slate-200/40">
              <button
                onClick={() => setMode('caisse')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  mode === 'caisse'
                    ? "bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200/50 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                )}
              >
                Caisse
              </button>
              <button
                onClick={() => setMode('commercial')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  mode === 'commercial'
                    ? "bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200/50 scale-[1.02]"
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                )}
              >
                Commercial
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-6 px-6 space-y-1.5 custom-scrollbar">
            {filteredItems.map((item: any) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-[0_8px_20px_rgba(79,70,229,0.25)] scale-[1.02] border-b-2 border-indigo-700/50" 
                      : "text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-transparent hover:border-slate-100"
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggle();
                  }}
                >
                  <div className={cn(
                    "p-2 rounded-xl shrink-0 transition-all duration-300",
                    isActive ? "bg-white/10" : "bg-slate-50 group-hover:bg-indigo-50"
                  )}>
                    <item.icon size={18} className={cn(
                      "transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600"
                    )} />
                  </div>
                  <span className={cn(
                    "text-sm tracking-tight flex-1 font-bold ms-3",
                    isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900"
                  )}>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"
                    />
                  )}
                  {!isActive && (
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all text-indigo-300 translate-x-[-4px] group-hover:translate-x-0" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="p-6">
            <button 
              onClick={logout}
              className="flex items-center justify-between w-full px-5 py-4 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all duration-300 group border border-slate-100 hover:border-red-100 shadow-sm hover:shadow-red-500/10"
              title={t('logout')}
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="transition-transform group-hover:-translate-x-1" />
                <span className="text-xs font-black uppercase tracking-widest">{t('logout')}</span>
              </div>
              <Circle size={8} className="fill-current text-slate-200 group-hover:text-red-500 group-hover:animate-pulse transition-colors" />
            </button>
            <div className="mt-6 flex flex-col items-center">
               <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] text-slate-300 font-bold tracking-tighter">Powered by</span>
                  <span className="text-[10px] text-indigo-400 font-black tracking-tight">SAF-CASH</span>
               </div>
               <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em]">Version 2.4.0 • 2026</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
