/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface EmptyPageProps {
  title: string;
  description?: string;
}

const Empty: React.FC<EmptyPageProps> = ({ title, description }) => {
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center max-w-md ${isRTL ? 'rtl' : 'ltr'}`}
      >
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
            <AlertCircle className="text-white" size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
          {title}
        </h1>
        
        <p className="text-gray-500 mb-6">
          {description || 'Cette fonctionnalité sera bientôt disponible. Revenez plus tard.'}
        </p>
        
        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl p-4 border border-indigo-200">
          <p className="text-sm text-indigo-700 font-medium">
            🚀 En cours de développement
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Empty;
