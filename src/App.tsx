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
  const { status, isAuthenticated, hasPermission } = useAuth();

  // Show spinner only during initial session restore
  if (status === 'initializing') return (
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
                <Route path="commercial/dashboard" element={<Empty title="Dashboard Commercial" description="Vue commerciale du tableau de bord" />} />
                <Route path="caisse" element={<Caisse />} />
                <Route path="banque" element={<Banque />} />
                <Route path="transfert" element={<Transfert />} />
                <Route path="ventes" element={<Ventes />} />
                <Route path="achats" element={<Achats />} />
                <Route path="clients" element={<Clients />} />
                <Route path="fournisseurs" element={<Fournisseurs />} />
                <Route path="depenses" element={<Depenses />} />
                <Route path="utilisateurs" element={<Utilisateurs />} />
                <Route path="rapports" element={<Rapports />} />
                <Route path="parametres" element={<Parametres />} />
                {/* Commercial Mode Pages */}
                <Route path="commercial/dashboard" element={<Empty title="Dashboard Commercial" description="Vue commerciale du tableau de bord" />} />
                <Route path="stockage" element={<Stockage />} />
                <Route path="production" element={<Production />} />
                <Route path="bon-commande" element={<BonCommande />} />
                <Route path="bon-livraison" element={<BonLivraison />} />
                <Route path="bon-reception" element={<BonReception />} />
                <Route path="facture-proformat" element={<FactureProformat />} />
                <Route path="inventaire" element={<Inventaire />} />
              </Route>
            </Routes>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

