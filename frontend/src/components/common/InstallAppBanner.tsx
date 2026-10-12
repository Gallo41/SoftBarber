import React, { useState } from 'react';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { IOSInstallModal } from './IOSInstallModal';
import { Button } from './Button';

export interface InstallAppBannerProps {
  className?: string;
  forceShow?: boolean;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  className = '',
  forceShow = false,
}) => {
  const { isInstallable, isIOS, isStandalone, isDismissed, promptInstall, dismiss } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  // Do not show if already standalone, or if dismissed (unless forced), or not installable
  if (!forceShow && (isStandalone || isDismissed || !isInstallable)) {
    return (
      <>
        {showIOSModal && (
          <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
        )}
      </>
    );
  }

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
    <>
      <aside
        aria-label="Instalar aplicativo"
        className={`bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden ${className}`}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm shadow-amber-500/20">
              <Download size={22} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                  Instalar Aplicativo SoftBarber
                </h3>
                <Sparkles size={13} className="text-amber-400 shrink-0" />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                Acesse seus horários e créditos direto da tela de início sem digitar URL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
            >
              <Smartphone size={14} />
              <span>Instalar</span>
            </Button>

            <button
              type="button"
              onClick={dismiss}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Dispensar aviso de instalação"
              title="Dispensar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Modal */}
      {showIOSModal && (
        <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
};

export default InstallAppBanner;
