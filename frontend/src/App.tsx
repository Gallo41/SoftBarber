import React, { useState } from 'react';
import { Header, AppMode } from './components/layout/Header';
import { BottomNav, ClientNavTab } from './components/layout/BottomNav';
import { ClientPortal } from './pages/ClientPortal';
import { AdminDashboard } from './pages/AdminDashboard';

export const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('client');
  const [clientTab, setClientTab] = useState<ClientNavTab>('booking');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-amber-500 selection:text-zinc-950">
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

export default App;
