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
    <header className={`sticky top-0 z-30 w-full bg-card border-b-[1.5px] border-ink ${className}`}>
      {/* Barber pole stripe banner on the very top */}
      <div className="pole-stripe" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left: Vintage Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink shadow-stamp-sm">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6 rotate-45" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl sm:text-2xl text-ink tracking-tight">
                {barbershopName}
              </span>
              <span className="font-sign uppercase tracking-[0.14em] text-[0.65rem] text-ink-muted hidden xs:inline">
                · Est. 2026
              </span>
            </div>
            <p className="font-sign uppercase tracking-wider text-[10px] text-ink-soft hidden xs:block">
              Barbearia Tradicional & Gestão de Créditos
            </p>
          </div>
        </div>

        {/* Right: Quick Indicators & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Credits Pill (Client Mode) */}
          {activeMode === 'client' && activeClientCredits > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-paper-dark border-[1.5px] border-ink text-ink font-sign text-xs uppercase tracking-wider">
              <Wallet size={14} className="text-pole-red" />
              <span>
                {activeClientCredits} {activeClientCredits === 1 ? 'crédito' : 'créditos'}
              </span>
            </div>
          )}

          {/* Admin Session Badge (When Authenticated) */}
          {isAdminAuthenticated && (
            <div
              data-testid="admin-active-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-moss-tint border-[1.5px] border-moss text-moss font-sign text-xs uppercase tracking-wider"
              title="Sessão de Administrador ativa"
            >
              <ShieldCheck size={14} className="text-moss shrink-0" />
              <span className="hidden md:inline">Admin Ativo</span>
            </div>
          )}

          {/* Bloquear Painel / Sair do Admin Button (When Authenticated) */}
          {isAdminAuthenticated && (
            <button
              type="button"
              onClick={handleLockAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-sm bg-card border-[1.5px] border-ink text-ink hover:bg-pole-red-tint hover:text-pole-red hover:border-pole-red font-sign text-xs uppercase tracking-wider shadow-stamp-sm active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all select-none"
              title="Bloquear Painel e encerrar sessão de administrador"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Bloquear Painel</span>
              <span className="sm:hidden">Bloquear</span>
            </button>
          )}

          {/* Install App Button (When not standalone) */}
          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-sm bg-card border-[1.5px] border-ink text-ink hover:bg-paper-dark font-sign text-xs uppercase tracking-wider shadow-stamp-sm active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all select-none"
              title="Instalar aplicativo SoftBarber no seu aparelho"
            >
              <Download size={14} className="text-pole-red" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Mode Switcher Buttons */}
          <div className="flex items-center p-0.5 rounded-sm bg-paper-dark border-[1.5px] border-ink">
            <button
              type="button"
              onClick={() => onModeChange('client')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-sm font-sign text-xs sm:text-sm uppercase tracking-wider transition-all select-none
                ${
                  activeMode === 'client'
                    ? 'bg-ink text-card shadow-sm'
                    : 'text-ink-soft hover:text-ink hover:bg-paper'
                }
              `}
              title="Acessar visão do cliente para agendamentos e carteira"
            >
              <User size={14} />
              <span className="hidden xs:inline">Visão do Cliente</span>
              <span className="xs:hidden">Cliente</span>
            </button>

            <button
              type="button"
              onClick={handleAdminModeClick}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-sm font-sign text-xs sm:text-sm uppercase tracking-wider transition-all select-none
                ${
                  activeMode === 'admin'
                    ? 'bg-ink text-card shadow-sm'
                    : 'text-ink-soft hover:text-ink hover:bg-paper'
                }
              `}
              title="Acessar painel do profissional e gestão de horários"
            >
              <LayoutDashboard size={14} />
              <span className="hidden xs:inline">Painel da Barbearia</span>
              <span className="xs:hidden">Painel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Pin Touch Modal */}
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          setShowPinModal(false);
          onModeChange('admin');
        }}
      />

      {/* iOS Modal */}
      {showIOSModal && (
        <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
      )}
    </header>
  );
};

export default Header;
