import React from 'react';
import { X, Share, PlusSquare, Smartphone, Check } from 'lucide-react';
import { Button } from './Button';

export interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div className="w-full max-w-md bg-card border-[1.5px] border-ink rounded-sm p-6 shadow-stamp-lg relative animate-slide-up pt-7 overflow-hidden">
        {/* Barber pole top stripe */}
        <div className="pole-stripe absolute top-0 left-0 right-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-paper-dark border border-transparent hover:border-ink transition-colors"
          aria-label="Fechar instruções"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-pole-red shadow-stamp-sm">
            <Smartphone size={22} strokeWidth={2} />
          </div>
          <div>
            <h2 id="ios-install-title" className="font-display text-xl text-ink">
              Instalar no iPhone / iPad
            </h2>
            <p className="font-sign uppercase tracking-wider text-[11px] text-ink-soft">
              Tenha o SoftBarber direto na sua tela inicial
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 rounded-sm bg-paper-dark border-[1.5px] border-ink">
            <div className="w-7 h-7 rounded-sm bg-card border border-ink flex items-center justify-center text-ink shrink-0 mt-0.5">
              <Share size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                1. Toque em Compartilhar
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                Na barra inferior do Safari, toque no ícone com a seta para cima.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-sm bg-paper-dark border-[1.5px] border-ink">
            <div className="w-7 h-7 rounded-sm bg-card border border-ink flex items-center justify-center text-ink shrink-0 mt-0.5">
              <PlusSquare size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                2. Adicionar à Tela de Início
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                Role o menu para baixo e selecione <span className="font-semibold text-ink">"Adicionar à Tela de Início"</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-sm bg-paper-dark border-[1.5px] border-ink">
            <div className="w-7 h-7 rounded-sm bg-card border border-ink flex items-center justify-center text-pole-red shrink-0 mt-0.5">
              <Check size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                3. Confirmar "Adicionar"
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                Toque em <span className="text-pole-red font-semibold">"Adicionar"</span> no canto superior direito para finalizar.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={onClose}
        >
          Entendi, vou instalar
        </Button>
      </div>
    </div>
  );
};

export default IOSInstallModal;
