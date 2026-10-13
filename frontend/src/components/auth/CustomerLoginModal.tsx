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
      className={`fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 animate-fade-in ${className}`}
    >
      <div className="bg-card border-[1.5px] border-ink rounded-sm p-6 sm:p-8 max-w-md w-full shadow-stamp-lg text-ink relative pt-8 overflow-hidden animate-slide-up">
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

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink mb-3 shadow-stamp-sm">
            <UserCheck size={24} strokeWidth={2} />
          </div>

          <h2
            id="customer-login-title"
            className="font-display text-2xl text-ink tracking-tight"
          >
            Identifique-se
          </h2>
          <p className="font-sign uppercase tracking-wider text-[11px] text-ink-soft mt-1 max-w-xs">
            Digite seu WhatsApp para acessar seus créditos e agendamentos
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            data-testid="customer-login-error"
            className="mb-4 p-3 rounded-sm bg-pole-red-tint border-[1.5px] border-pole-red text-pole-red text-xs text-center font-medium"
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
              className="block font-sign uppercase tracking-wider text-xs text-ink mb-1"
            >
              Telefone / WhatsApp <span className="text-pole-red">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <Phone size={16} />
              </div>
              <input
                id="customer-phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 98765-4321"
                disabled={isLoading}
                className="input-paper pl-9 text-sm"
              />
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label
              htmlFor="customer-name"
              className="block font-sign uppercase tracking-wider text-xs text-ink mb-1"
            >
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <User size={16} />
              </div>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome (ex: João Silva)"
                disabled={isLoading}
                className="input-paper pl-9 text-sm"
              />
            </div>
            <p className="font-sign uppercase tracking-wider text-[10px] text-ink-muted mt-1">
              Opcional para quem já tem cadastro, obrigatório no primeiro acesso.
            </p>
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="customer-email"
              className="block font-sign uppercase tracking-wider text-xs text-ink mb-1"
            >
              E-mail (opcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <Mail size={16} />
              </div>
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com (opcional)"
                disabled={isLoading}
                className="input-paper pl-9 text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-pole-red hover:bg-pole-red-dark text-card font-sign uppercase tracking-wider font-semibold rounded-sm text-sm border-[1.5px] border-ink shadow-stamp-sm active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 select-none"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
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
