import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, X, Loader2, Phone, User, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types/api';

export interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
  className?: string;
}

/**
 * Format raw numbers or unformatted strings to Brazilian phone format:
 * - 11 digits: (XX) XXXXX-XXXX
 * - 10 digits: (XX) XXXX-XXXX
 */
export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({
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
  const loginCustomer =
    auth?.loginCustomer ??
    (async () => {
      throw new Error('useAuth must be used within an AuthProvider');
    });

  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setName('');
      setEmail('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setPhone(formatted);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 8) {
      setError('Informe seu telefone / WhatsApp com DDD.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginCustomer(
        phone.trim(),
        name.trim() || undefined,
        email.trim() || undefined
      );

      if (onSuccess) {
        onSuccess(response.customer);
      }
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Não foi possível identificar o cliente. Tente novamente.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-login-title"
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${className}`}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-zinc-100 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-sm shadow-amber-500/10">
            <UserCheck size={28} />
          </div>

          <h2
            id="customer-login-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100"
          >
            Identifique-se
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xs">
            Digite seu WhatsApp para acessar seus créditos de pacotes e horários agendados
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            data-testid="customer-login-error"
            className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm text-center font-medium animate-in fade-in duration-150"
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Field */}
          <div>
            <label
              htmlFor="customer-phone"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              Telefone / WhatsApp <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Phone size={17} />
              </div>
              <input
                id="customer-phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 98765-4321"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label
              htmlFor="customer-name"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <User size={17} />
              </div>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome (ex: João Silva)"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 transition-colors"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Opcional para quem já tem cadastro, obrigatório no primeiro acesso.
            </p>
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="customer-email"
              className="block text-xs font-semibold text-zinc-300 mb-1.5"
            >
              E-mail (opcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail size={17} />
              </div>
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com (opcional)"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] select-none"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Identificando...</span>
              </>
            ) : (
              <span>Entrar / Identificar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomerLoginModal;
