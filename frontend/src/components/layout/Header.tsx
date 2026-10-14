import React, { useState } from 'react';
import {
  Scissors,
  User,
  LayoutDashboard,
  Wallet,
  Download,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { IOSInstallModal } from '../common/IOSInstallModal';
import { useAuth } from '../../context/AuthContext';
import { AdminPinModal } from '../auth/AdminPinModal';

export type AppMode = 'client' | 'admin';

export interface HeaderProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activeClientCredits?: number;
  barbershopName?: string;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onModeChange,
  activeClientCredits = 0,
  barbershopName = 'SoftBarber',
  className = '',
}) => {
  const { isStandalone, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  // Consume useAuth safely
  let auth: ReturnType<typeof useAuth> | undefined;
  try {
    auth = useAuth();
  } catch {
    auth = undefined;
  }

  const isAdminAuthenticated = auth?.isAdminAuthenticated ?? false;
  const logoutAdmin = auth?.logoutAdmin ?? (() => {});

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    const result = await promptInstall();
    if (result === 'manual_ios') {
      setShowIOSModal(true);
    }
  };

  const handleAdminModeClick = () => {
    if (isAdminAuthenticated) {
      onModeChange('admin');
    } else {
      setShowPinModal(true);
    }
  };

  const handleLockAdmin = () => {
    logoutAdmin();
    onModeChange('client');
  };

  return (
    <header className={`sticky top-0 z-30 w-full bg-[#FAFAF9]/90 backdrop-blur-md border-b border-slate-200/80 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Scissors className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
                {barbershopName}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden xs:inline-block">
                Barbearia
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal hidden xs:block">
              Agendamentos & Gestão de Créditos
            </p>
          </div>
        </div>

        {/* Right: Quick Indicators & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Credits Pill (Client Mode) */}
          {activeMode === 'client' && activeClientCredits > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/60 text-slate-800 text-xs font-medium"
              title="Créditos ativos em pacotes"
            >
              <Wallet size={13} className="text-blue-600" />
              <span>
                {activeClientCredits} {activeClientCredits === 1 ? 'crédito' : 'créditos'}
              </span>
            </div>
          )}

          {/* Admin Session Badge (When Authenticated) */}
          {isAdminAuthenticated && (
            <div
              data-testid="admin-active-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs"
              title="Sessão de Administrador ativa"
            >
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <span className="hidden md:inline">Admin Autenticado</span>
            </div>
          )}

          {/* Bloquear Painel / Sair do Admin Button (When Authenticated) */}
          {isAdminAuthenticated && (
            <button
              type="button"
              onClick={handleLockAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition-all shadow-xs select-none"
              title="Bloquear Painel e encerrar sessão de administrador"
              aria-label="Bloquear Painel"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Bloquear Painel</span>
              <span className="sm:hidden">Bloquear</span>
            </button>
          )}

          {/* Install PWA Button (if browser supports and not in standalone) */}
          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all shadow-xs select-none"
              title="Instalar aplicativo"
            >
              <Download size={14} className="text-slate-600" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Mode Switcher Segmented Control (Apple style) */}
          <div
            className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 select-none"
            aria-label="Alternar modo de visualização"
          >
            {/* Client Mode Tab */}
            <button
              type="button"
              onClick={() => onModeChange('client')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  activeMode === 'client'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }
              `}
              title="Acessar visão do cliente para agendamentos e carteira"
            >
              <User size={13} />
              <span className="hidden xs:inline">Visão do Cliente</span>
              <span className="xs:hidden">Cliente</span>
            </button>

            {/* Admin / Barber Mode Tab */}
            <button
              type="button"
              onClick={handleAdminModeClick}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  activeMode === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }
              `}
              title="Acessar painel do profissional e gestão de horários"
            >
              <LayoutDashboard size={13} />
              <span className="hidden xs:inline">Painel da Barbearia</span>
              <span className="xs:hidden">Painel</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSModal && (
        <IOSInstallModal
          isOpen={showIOSModal}
          onClose={() => setShowIOSModal(false)}
        />
      )}

      {/* Admin PIN Authentication Modal */}
      {showPinModal && (
        <AdminPinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSuccess={() => {
            setShowPinModal(false);
            onModeChange('admin');
          }}
        />
      )}
    </header>
  );
};

export default Header;
