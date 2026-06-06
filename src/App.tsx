/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Caisse from './pages/Caisse';
import Banque from './pages/Banque';
import Transfert from './pages/Transfert';
import Ventes from './pages/Ventes';
import Achats from './pages/Achats';
import Clients from './pages/Clients';
import Fournisseurs from './pages/Fournisseurs';
import Depenses from './pages/Depenses';
import Utilisateurs from './pages/Utilisateurs';
import Rapports from './pages/Rapports';
import Parametres from './pages/Parametres';

// Commercial Mode Pages
import Stockage from './pages/Stockage';
import Production from './pages/Production';
import BonCommande from './pages/BonCommande';
import BonLivraison from './pages/BonLivraison';
import BonReception from './pages/BonReception';
import FactureProformat from './pages/FactureProformat';
import Inventaire from './pages/Inventaire';

import Empty from './pages/Empty';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const { status, isAuthenticated, hasPermission, user } = useAuth();

  // Spinner during: initial session restore, OR authenticated but profile not yet loaded
  // (profile is needed for permission checks — without it hasPermission always returns false,
  //  which would incorrectly redirect the user to "/" on refresh)
  if (status === 'initializing' || (isAuthenticated && !user && !!permission)) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-semibold text-lg">Chargement...</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="caisse"            element={<ProtectedRoute permission="view_caisse"><Caisse /></ProtectedRoute>} />
                <Route path="banque"            element={<ProtectedRoute permission="view_bank"><Banque /></ProtectedRoute>} />
                <Route path="transfert"         element={<ProtectedRoute permission="view_transfer"><Transfert /></ProtectedRoute>} />
                <Route path="ventes"            element={<ProtectedRoute permission="view_sales"><Ventes /></ProtectedRoute>} />
                <Route path="achats"            element={<ProtectedRoute permission="view_purchases"><Achats /></ProtectedRoute>} />
                <Route path="clients"           element={<ProtectedRoute permission="view_clients"><Clients /></ProtectedRoute>} />
                <Route path="fournisseurs"      element={<ProtectedRoute permission="view_suppliers"><Fournisseurs /></ProtectedRoute>} />
                <Route path="depenses"          element={<ProtectedRoute permission="view_expenses"><Depenses /></ProtectedRoute>} />
                <Route path="utilisateurs"      element={<ProtectedRoute permission="view_users"><Utilisateurs /></ProtectedRoute>} />
                <Route path="rapports"          element={<ProtectedRoute permission="view_reports"><Rapports /></ProtectedRoute>} />
                <Route path="parametres"        element={<ProtectedRoute permission="view_settings"><Parametres /></ProtectedRoute>} />
                
                {/* Commercial Mode Pages */}
                <Route path="commercial/dashboard" element={<Empty title="Dashboard Commercial" description="Vue commerciale du tableau de bord" />} />
                <Route path="stockage"          element={<ProtectedRoute permission="view_stockage"><Stockage /></ProtectedRoute>} />
                <Route path="production"        element={<ProtectedRoute permission="view_production"><Production /></ProtectedRoute>} />
                <Route path="bon-commande"      element={<ProtectedRoute permission="view_bon_commande"><BonCommande /></ProtectedRoute>} />
                <Route path="bon-livraison"     element={<ProtectedRoute permission="view_bon_livraison"><BonLivraison /></ProtectedRoute>} />
                <Route path="bon-reception"     element={<ProtectedRoute permission="view_bon_reception"><BonReception /></ProtectedRoute>} />
                <Route path="facture-proformat" element={<ProtectedRoute permission="view_proformat"><FactureProformat /></ProtectedRoute>} />
                <Route path="inventaire"        element={<ProtectedRoute permission="view_inventaire"><Inventaire /></ProtectedRoute>} />
              </Route>
            </Routes>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

