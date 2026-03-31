/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Overview from './components/Overview';
import Clients from './components/Clients';
import Map from './components/Map';
import Reports from './components/Reports';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'clients':
        return <Clients />;
      case 'map':
        return <Map />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center">
              <span className="text-4xl">⚙️</span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface">Configuración</h2>
            <p className="text-on-surface-variant max-w-xs">Ajustes del sistema y preferencias de usuario.</p>
          </div>
        );
      default:
        return <Overview />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
