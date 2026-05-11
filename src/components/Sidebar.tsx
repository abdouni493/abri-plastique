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
          "fixed top-0 bottom-0 z-50 bg-white border-e border-slate-200 overflow-hidden lg:static lg:block shadow-2xl lg:shadow-none",
          isRTL ? "right-0" : "left-0"
        )}
      >
        <div className="flex flex-col h-full w-[300px]">
          {/* Logo Section */}
          <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0 bg-white">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xl overflow-hidden border border-slate-100 bg-white">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 flex items-center justify-center">
                  <span className="text-white font-black text-xl">{settings.name?.[0] || 'E'}</span>
                </div>
              )}
            </div>
            <div className="ms-4 overflow-hidden">
              <h1 className="text-lg font-black text-slate-900 truncate tracking-tight">
                {settings.name || 'ABRI PLASTIQUE'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Circle size={6} className="text-emerald-500 fill-emerald-500" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Système Actif</p>
              </div>
            </div>
          </div>

          {/* User Profile Snippet */}
          <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-200">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-slate-900 truncate">{user?.name || 'Administrateur'}</p>
                <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{user?.role || 'Admin'}</p>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="px-4 py-4 border-b border-slate-100 shrink-0">
            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 w-full border border-slate-200/50">
              <button
                onClick={() => setMode('caisse')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === 'caisse'
                    ? "bg-white text-indigo-600 shadow-md border border-slate-200/20"
                    : "text-slate-500 hover:bg-white/50"
                )}
              >
                Caisse
              </button>
              <button
                onClick={() => setMode('commercial')}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === 'commercial'
                    ? "bg-white text-indigo-600 shadow-md border border-slate-200/20"
                    : "text-slate-500 hover:bg-white/50"
                )}
              >
                Commercial
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
            {filteredItems.map((item: any) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                    isActive 
                      ? "bg-slate-900 text-white font-bold shadow-xl shadow-slate-200" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggle();
                  }}
                >
                  <item.icon size={20} className={cn(
                     "shrink-0 transition-transform group-hover:scale-110",
                     isRTL ? "ml-3" : "mr-3",
                     isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className="text-sm tracking-tight flex-1">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500"
                    />
                  )}
                  {!isActive && (
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all text-slate-300" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="p-6 border-t border-slate-100">
            <button 
              onClick={logout}
              className="flex items-center justify-between w-full px-5 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all group border border-red-100"
              title={t('logout')}
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="transition-transform group-hover:-translate-x-1" />
                <span className="text-xs font-black uppercase tracking-widest">{t('logout')}</span>
              </div>
              <Circle size={8} className="fill-red-600 animate-pulse" />
            </button>
            <p className="text-[9px] text-slate-400 font-bold text-center mt-4 uppercase tracking-[0.2em]">SAF-Cash • 2026</p>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
