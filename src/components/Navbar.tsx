/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Bell, Languages, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const Navbar = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { user } = useAuth();

  return (
    <header className="h-16 bg-gradient-to-r from-white via-indigo-50/30 to-white border-b border-indigo-100/30 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-lg shadow-lg">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-gradient-to-br hover:from-indigo-100 hover:to-purple-100 rounded-lg text-gray-600 flex items-center justify-center transition-all"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{t('dashboard')}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 font-sans">
        {/* Language Switcher */}
        <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg p-1">
          <button
            onClick={() => setLanguage('fr')}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold transition-all uppercase tracking-wide",
              language === 'fr' ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "text-gray-600 hover:text-gray-900"
            )}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-bold transition-all font-sans uppercase tracking-wide",
              language === 'ar' ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "text-gray-600 hover:text-gray-900"
            )}
          >
            AR
          </button>
        </div>

        {/* Notifications */}
        <button className="p-2 hover:bg-gradient-to-br hover:from-yellow-100 hover:to-orange-100 rounded-lg text-gray-600 relative transition-all">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 ps-4 border-s border-indigo-100/50">
          <div className="text-end hidden sm:block">
            <p className="text-sm font-bold text-gray-900 leading-none">{user?.name}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">
              {user?.role === 'admin' ? t('admin') : t('worker')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white border-2 border-indigo-100 shadow-lg">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
