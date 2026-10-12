import React, { useState } from 'react';
import { Scissors, Sparkles, User, LayoutDashboard, Wallet, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { IOSInstallModal } from '../common/IOSInstallModal';

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

  return (
    <header
      className={`sticky top-0 z-30 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 ${className}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-zinc-100">
                {barbershopName}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-medium hidden xs:block">
              Barbearia & Gestão de Créditos
            </p>
          </div>
        </div>

        {/* Right: Quick Indicators & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Active Credits Pill (Client Mode) */}
          {activeMode === 'client' && activeClientCredits > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
              <Wallet size={14} className="text-amber-400" />
              <span>
                {activeClientCredits} {activeClientCredits === 1 ? 'crédito' : 'créditos'}
              </span>
            </div>
          )}

          {/* Install App Button (When not standalone) */}
          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-all shadow-sm select-none"
              title="Instalar aplicativo SoftBarber no seu aparelho"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Mode Switcher Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner">
            <button
              type="button"
              onClick={() => onModeChange('client')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 select-none
                ${
                  activeMode === 'client'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }
              `}
              title="Acessar visão do cliente para agendamentos e carteira"
            >
              <User size={15} />
              <span className="hidden xs:inline">Visão do Cliente</span>
              <span className="xs:hidden">Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('admin')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 select-none
                ${
                  activeMode === 'admin'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }
              `}
              title="Acessar painel do profissional e gestão de horários"
            >
              <LayoutDashboard size={15} />
              <span className="hidden xs:inline">Painel da Barbearia</span>
              <span className="xs:hidden">Painel</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Modal */}
      {showIOSModal && (
        <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
      )}
    </header>
  );
};

export default Header;
