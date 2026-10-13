import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Phone, User, Mail, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types/api';
import { Button } from '../common/Button';

export interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer?: Customer) => void;
  className?: string;
}

/**
 * Masks raw digits into a readable Brazilian mobile phone format:
 * (11) 98765-4321 or (11) 8765-4321
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
  const { loginCustomer } = useAuth();
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Reset form when opened
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
        onSuccess(response?.customer);
      }
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Erro ao identificar cliente. Tente novamente.'
      );
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
      className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in ${className}`}
    >
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-900 relative animate-slide-up overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 mb-3 shadow-xs">
            <UserCheck size={24} strokeWidth={2} />
          </div>

          <h2
            id="customer-login-title"
            className="font-bold text-xl sm:text-2xl text-slate-900 tracking-tight"
          >
            Identifique-se
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Digite seu WhatsApp para acessar seus créditos e agendamentos
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            data-testid="customer-login-error"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium"
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
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Telefone / WhatsApp <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone size={16} />
              </div>
              <input
                id="customer-phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 98765-4321"
                disabled={isLoading}
                className="input-clean pl-10"
              />
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label
              htmlFor="customer-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome (ex: João Silva)"
                disabled={isLoading}
                className="input-clean pl-10"
              />
            </div>
          </div>

          {/* Email Field (Optional) */}
          <div>
            <label
              htmlFor="customer-email"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              E-mail <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail size={16} />
              </div>
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                disabled={isLoading}
                className="input-clean pl-10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              loadingText="Identificando..."
              rightIcon={<ArrowRight size={15} />}
            >
              Entrar e Ver Créditos
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
              className="sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerLoginModal;
