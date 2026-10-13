import React, { useState } from 'react';
import { Header, AppMode } from './components/layout/Header';
import { BottomNav, ClientNavTab } from './components/layout/BottomNav';
import { ClientPortal } from './pages/ClientPortal';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthProvider } from './context/AuthContext';

export const AppContent: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('client');
  const [clientTab, setClientTab] = useState<ClientNavTab>('booking');

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col antialiased selection:bg-pole-red selection:text-card">
      {/* Top Application Header */}
      <Header
        activeMode={activeMode}
        onModeChange={(mode) => setActiveMode(mode)}
        barbershopName="SoftBarber"
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeMode === 'client' ? (
          <ClientPortal
            activeTab={clientTab}
            onTabChange={(tab) => setClientTab(tab)}
          />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Mobile Bottom Navigation (Only in Client Mode) */}
      {activeMode === 'client' && (
        <BottomNav
          activeTab={clientTab}
          onTabChange={(tab) => setClientTab(tab)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
