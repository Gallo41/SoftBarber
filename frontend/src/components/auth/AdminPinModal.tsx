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
      className={`fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 animate-fade-in ${className}`}
    >
      <div className="bg-card border-[1.5px] border-ink rounded-sm p-6 sm:p-8 max-w-sm w-full shadow-stamp-lg text-ink flex flex-col items-center relative pt-8 overflow-hidden animate-slide-up">
        {/* Barber pole top stripe */}
        <div className="pole-stripe absolute top-0 left-0 right-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-paper-dark border border-transparent hover:border-ink transition-colors"
        >
          <X size={20} />
        </button>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink mb-3 shadow-stamp-sm">
          <Lock size={22} strokeWidth={2} />
        </div>

        {/* Title & Description */}
        <h2
          id="admin-pin-title"
          className="font-display text-2xl text-ink text-center tracking-tight"
        >
          Acesso Administrativo
        </h2>
        <p className="font-sign uppercase tracking-wider text-[11px] text-ink-soft text-center mt-1 mb-4">
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
                className={`w-4 h-4 rounded-full border-[1.5px] transition-all duration-150 ${
                  isFilled
                    ? 'bg-pole-red border-ink scale-110 shadow-stamp-sm'
                    : 'bg-transparent border-ink'
                } ${error ? 'border-pole-red' : ''}`}
              />
            );
          })}
        </div>

        {/* Error message / Loading feedback */}
        <div className="min-h-[28px] flex items-center justify-center my-1 w-full">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs font-sign uppercase tracking-wider text-pole-red">
              <Loader2 size={14} className="animate-spin" />
              <span>Verificando PIN...</span>
            </div>
          ) : error ? (
            <p
              role="alert"
              className="text-xs font-semibold text-pole-red text-center"
              data-testid="pin-error"
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* Touch Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px] mt-2 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(digit.toString())}
              className="h-13 sm:h-14 rounded-sm bg-card hover:bg-paper-dark active:bg-pole-red active:text-card disabled:opacity-50 font-display text-2xl text-ink transition-all border-[1.5px] border-ink shadow-stamp-sm flex items-center justify-center active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
            >
              {digit}
            </button>
          ))}

          {/* Action: Limpar */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-13 sm:h-14 rounded-sm bg-paper-dark hover:bg-paper-deep text-ink-soft hover:text-ink active:text-pole-red disabled:opacity-30 font-sign uppercase tracking-wider text-xs transition-all border-[1.5px] border-ink shadow-stamp-sm flex flex-col items-center justify-center gap-0.5 active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RotateCcw size={15} />
            <span>Limpar</span>
          </button>

          {/* Digit: 0 */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="h-13 sm:h-14 rounded-sm bg-card hover:bg-paper-dark active:bg-pole-red active:text-card disabled:opacity-50 font-display text-2xl text-ink transition-all border-[1.5px] border-ink shadow-stamp-sm flex items-center justify-center active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
          >
            0
          </button>

          {/* Action: Apagar (Backspace) */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleBackspace}
            className="h-13 sm:h-14 rounded-sm bg-paper-dark hover:bg-paper-deep text-ink-soft hover:text-ink active:text-pole-red disabled:opacity-30 font-sign uppercase tracking-wider text-xs transition-all border-[1.5px] border-ink shadow-stamp-sm flex flex-col items-center justify-center gap-0.5 active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Delete size={16} />
            <span>Apagar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPinModal;
