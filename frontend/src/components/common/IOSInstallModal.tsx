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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative animate-slide-up"
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          aria-label="Fechar instruções"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
            <Smartphone size={24} />
          </div>
          <div>
            <h2 id="ios-install-title" className="text-lg font-bold text-zinc-100">
              Instalar no iPhone / iPad
            </h2>
            <p className="text-xs text-zinc-400">
              Tenha o SoftBarber direto na sua tela inicial
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Share size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                1. Toque em Compartilhar
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Na barra inferior do Safari, toque no ícone com a seta para cima.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <PlusSquare size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                2. Adicionar à Tela de Início
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Role o menu para baixo e selecione a opção <span className="text-zinc-200 font-medium">"Adicionar à Tela de Início"</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                3. Confirmar "Adicionar"
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Toque em <span className="text-amber-400 font-medium">"Adicionar"</span> no canto superior direito para finalizar.
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
