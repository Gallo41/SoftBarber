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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl relative animate-slide-up overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Fechar instruções"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
            <Smartphone size={22} strokeWidth={2} />
          </div>
          <div>
            <h2 id="ios-install-title" className="font-bold text-lg text-slate-900 tracking-tight">
              Instalar no iPhone / iPad
            </h2>
            <p className="text-xs text-slate-500">
              Tenha o SoftBarber direto na sua tela inicial
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-xs">
              <Share size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                1. Toque em Compartilhar
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Na barra inferior do Safari, toque no ícone com a seta para cima.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5 shadow-xs">
              <PlusSquare size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                2. Adicionar à Tela de Início
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Role para baixo e selecione &quot;Adicionar à Tela de Início&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 shadow-xs">
              <Check size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                3. Confirmar &quot;Adicionar&quot;
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Toque em &quot;Adicionar&quot; no canto superior direito para finalizar.
              </p>
            </div>
          </div>
        </div>

        {/* Close Action */}
        <Button
          fullWidth
          variant="primary"
          onClick={onClose}
        >
          Entendi, vou instalar
        </Button>
      </div>
    </div>
  );
};

export default IOSInstallModal;
