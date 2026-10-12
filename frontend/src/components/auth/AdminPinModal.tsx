import React, { useState, useEffect, useCallback } from 'react';
import { Lock, X, Delete, RotateCcw, Loader2 } from 'lucide-react';
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
  let auth: ReturnType<typeof useAuth> | undefined;
  try {
    auth = useAuth();
  } catch {
    auth = undefined;
  }
  const loginAdmin = auth?.loginAdmin ?? (async () => { throw new Error('useAuth must be used within an AuthProvider'); });
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset internal state when modal opens
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
        await loginAdmin(pinToSubmit);
        setPin('');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.detail ||
          err?.message ||
          'PIN de administrador incorreto.';
        setError(errorMsg);
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
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${className}`}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-zinc-100 flex flex-col items-center relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-sm shadow-amber-500/10">
          <Lock size={26} />
        </div>

        {/* Title & Description */}
        <h2
          id="admin-pin-title"
          className="text-xl font-bold tracking-tight text-zinc-100 text-center"
        >
          Acesso Administrativo
        </h2>
        <p className="text-xs text-zinc-400 text-center mt-1 mb-4">
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
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-amber-500 ring-4 ring-amber-500/20 scale-110'
                    : 'border-2 border-zinc-700 bg-zinc-950'
                } ${error ? 'border-rose-500' : ''}`}
              />
            );
          })}
        </div>

        {/* Error message / Loading feedback */}
        <div className="min-h-[28px] flex items-center justify-center my-1 w-full">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Verificando PIN...</span>
            </div>
          ) : error ? (
            <p
              role="alert"
              className="text-xs font-semibold text-rose-400 text-center"
              data-testid="pin-error"
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* Touch Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mt-2 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(digit.toString())}
              className="h-14 sm:h-16 rounded-2xl bg-zinc-800/80 hover:bg-zinc-750 active:bg-amber-500 active:text-zinc-950 disabled:opacity-50 text-xl sm:text-2xl font-bold text-zinc-100 transition-all border border-zinc-700/50 shadow-sm flex items-center justify-center active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Action: Limpar */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-14 sm:h-16 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:text-rose-400 disabled:opacity-30 text-xs sm:text-sm font-semibold transition-all border border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <RotateCcw size={16} />
            <span>Limpar</span>
          </button>

          {/* Digit: 0 */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="h-14 sm:h-16 rounded-2xl bg-zinc-800/80 hover:bg-zinc-750 active:bg-amber-500 active:text-zinc-950 disabled:opacity-50 text-xl sm:text-2xl font-bold text-zinc-100 transition-all border border-zinc-700/50 shadow-sm flex items-center justify-center active:scale-95"
          >
            0
          </button>

          {/* Action: Apagar (Backspace) */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleBackspace}
            className="h-14 sm:h-16 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:text-amber-400 disabled:opacity-30 text-xs sm:text-sm font-semibold transition-all border border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <Delete size={18} />
            <span>Apagar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPinModal;
