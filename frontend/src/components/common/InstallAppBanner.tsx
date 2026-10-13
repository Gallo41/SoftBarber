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
        className={`bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Download size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight">
                Instalar Aplicativo SoftBarber
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
