import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
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
        className={`bg-card border-[1.5px] border-ink rounded-sm p-4 shadow-stamp-sm relative overflow-hidden pt-5 ${className}`}
      >
        {/* Barber pole top stripe */}
        <div className="pole-stripe absolute top-0 left-0 right-0" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-pole-red shrink-0 shadow-stamp-sm">
              <Download size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display text-base text-ink tracking-tight">
                Instalar Aplicativo SoftBarber
              </h3>
              <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">
                Acesse seus horários e créditos direto da tela de início sem digitar URL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Smartphone size={14} />
              <span>Instalar</span>
            </Button>

            <button
              type="button"
              onClick={dismiss}
              className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors border border-transparent hover:border-ink"
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
