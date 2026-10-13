import React, { useState, useEffect, useCallback } from 'react';
import { Lock, X, RotateCcw, Delete, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  className = '',
}) => {
  const { loginAdmin } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const submitPin = useCallback(
    async (pinToSubmit: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const success = await loginAdmin(pinToSubmit);
        if (success) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError('PIN incorreto. Tente novamente.');
          setPin('');
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Erro ao autenticar. Tente novamente.');
        setPin('');
      } finally {
        setIsLoading(false);
      }
    },
    [loginAdmin, onSuccess, onClose]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLoading || pin.length >= 4) return;
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    },
    [isLoading, pin, submitPin]
  );

  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (isLoading) return;
    setPin('');
    setError(null);
  }, [isLoading]);

  // Physical keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pin-title"
      className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in ${className}`}
    >
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-slate-900 flex flex-col items-center relative animate-slide-up overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 mb-3 shadow-xs">
          <Lock size={22} strokeWidth={2} />
        </div>

        {/* Title & Description */}
        <h2
          id="admin-pin-title"
          className="font-bold text-xl sm:text-2xl text-slate-900 text-center tracking-tight"
        >
          Acesso Administrativo
        </h2>
        <p className="text-xs text-slate-500 text-center mt-1 mb-4">
          Digite o PIN de 4 dígitos para gerenciar o painel
        </p>

        {/* 4 Feedback Indicator Circles */}
        <div
          className="flex justify-center items-center gap-4 my-2"
          data-testid="pin-indicators"
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                data-testid={`pin-dot-${index}`}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? 'bg-slate-900 border-slate-900 scale-110 shadow-xs'
                    : 'bg-transparent border-slate-300'
                } ${error ? 'border-rose-500 bg-rose-500' : ''}`}
              />
            );
          })}
        </div>

        {/* Error message / Loading feedback */}
        <div className="min-h-[28px] flex items-center justify-center my-1 w-full">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Loader2 size={14} className="animate-spin" />
              <span>Verificando PIN...</span>
            </div>
          ) : error ? (
            <p
              role="alert"
              className="text-xs font-semibold text-rose-600 text-center"
              data-testid="pin-error"
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* iOS-Style Touch Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mt-2 select-none justify-items-center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(digit.toString())}
              className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 active:scale-95 disabled:opacity-50 text-2xl font-semibold text-slate-900 transition-all border border-slate-100 flex items-center justify-center shadow-xs"
            >
              {digit}
            </button>
          ))}

          {/* Action: Limpar */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="w-16 h-16 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 disabled:opacity-30 text-xs font-medium transition-all flex flex-col items-center justify-center gap-0.5"
          >
            <RotateCcw size={16} />
            <span className="text-[10px]">Limpar</span>
          </button>

          {/* Digit: 0 */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 active:scale-95 disabled:opacity-50 text-2xl font-semibold text-slate-900 transition-all border border-slate-100 flex items-center justify-center shadow-xs"
          >
            0
          </button>

          {/* Action: Apagar (Backspace) */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 disabled:opacity-30 text-xs font-medium transition-all flex flex-col items-center justify-center gap-0.5"
          >
            <Delete size={17} />
            <span className="text-[10px]">Apagar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPinModal;
