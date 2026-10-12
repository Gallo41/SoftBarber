import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Sparkles,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  Service,
  Professional,
  AvailableSlot,
  CustomerPackageResponse,
  PackageStatus,
  PaymentType,
  AppointmentResponse,
  AppointmentStatus,
} from '../../types/api';
import { bookWithCredit } from '../../api/appointments';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrencyBRL } from './ServiceCard';
import { formatSlotTime } from './SlotPicker';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  professional: Professional | null;
  slot: AvailableSlot | null;
  selectedDate: string; // YYYY-MM-DD
  customerPackages?: CustomerPackageResponse[];
  onSuccess: (appointment: AppointmentResponse) => void;
  onSlotConflict?: () => void;
  onBookLocal?: (data: {
    serviceId: number;
    professionalId: number;
    startTime: string;
  }) => Promise<AppointmentResponse | void> | void;
  className?: string;
}

/**
 * Generates a valid UUID v4 string for request idempotency.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Builds an ISO-8601 datetime string from date (YYYY-MM-DD) and time string.
 */
export function buildIsoStartTime(dateStr: string, timeStr: string): string {
  if (timeStr.includes('T')) {
    return timeStr;
  }
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}`;
}

/**
 * Formats date and time into a friendly Brazilian Portuguese description.
 */
function formatFriendlyDateTime(dateStr: string, timeStr: string): string {
  try {
    const formattedTime = formatSlotTime(timeStr);
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(dateObj);

    const capitalizedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    return `${capitalizedDate} às ${formattedTime}`;
  } catch {
    return `${dateStr} às ${formatSlotTime(timeStr)}`;
  }
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  service,
  professional,
  slot,
  selectedDate,
  customerPackages = [],
  onSuccess,
  onSlotConflict,
  onBookLocal,
  className = '',
}) => {
  // Find eligible packages that contain remaining credits for this service
  const eligiblePackages = useMemo(() => {
    if (!customerPackages || customerPackages.length === 0 || !service) return [];
    const now = new Date();

    return customerPackages.filter((pkg) => {
      if (pkg.status !== PackageStatus.ACTIVE) return false;
      const expiry = new Date(pkg.expires_at);
      if (expiry <= now) return false;

      const balance = pkg.balances?.find(
        (b) => b.service_id === service.id && b.remaining_quantity > 0
      );
      return Boolean(balance);
    });
  }, [customerPackages, service]);

  // Total available credits across all active packages for this service
  const totalCredits = useMemo(() => {
    if (!service) return 0;
    return eligiblePackages.reduce((sum, pkg) => {
      const bal = pkg.balances?.find((b) => b.service_id === service.id);
      return sum + (bal?.remaining_quantity || 0);
    }, 0);
  }, [eligiblePackages, service]);

  // Primary package to debit from (defaults to the first/earliest active eligible package)
  const defaultPackage = eligiblePackages[0] || null;

  // Local state
  const [paymentOption, setPaymentOption] = useState<'CREDIT' | 'LOCAL'>('CREDIT');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    defaultPackage?.id ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<AppointmentResponse | null>(null);

  // Reset state when modal opens or inputs change
  useEffect(() => {
    if (isOpen) {
      setIsConflict(false);
      setErrorMessage(null);
      setConfirmedAppointment(null);
      setIsSubmitting(false);

      if (totalCredits > 0) {
        setPaymentOption('CREDIT');
        setSelectedPackageId(defaultPackage?.id ?? null);
      } else {
        setPaymentOption('LOCAL');
        setSelectedPackageId(null);
      }
    }
  }, [isOpen, service?.id, slot?.start_time, totalCredits, defaultPackage?.id]);

  if (!isOpen || !service || !slot) {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleConflictResolve = () => {
    setIsConflict(false);
    setErrorMessage(null);
    if (onSlotConflict) {
      onSlotConflict();
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!professional || !service || !slot) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setIsConflict(false);

    const startTimeIso = buildIsoStartTime(selectedDate, slot.start_time);
    const idempotencyKey = generateIdempotencyKey();

    try {
      if (paymentOption === 'CREDIT') {
        const pkgToUse =
          eligiblePackages.find((p) => p.id === selectedPackageId) ||
          eligiblePackages[0];

        if (!pkgToUse) {
          throw new Error('Nenhum pacote ativo com créditos encontrado.');
        }

        const appointment = await bookWithCredit(
          {
            customer_package_id: pkgToUse.id,
            service_id: service.id,
            professional_id: professional.id,
            start_time: startTimeIso,
            idempotency_key: idempotencyKey,
          },
          idempotencyKey
        );

        setConfirmedAppointment(appointment);
        onSuccess(appointment);
      } else {
        // Direct / Local Payment Option
        if (onBookLocal) {
          const res = await onBookLocal({
            serviceId: service.id,
            professionalId: professional.id,
            startTime: startTimeIso,
          });
          if (res) {
            setConfirmedAppointment(res);
            onSuccess(res);
          } else {
            // Simulated local booking response
            const simulated: AppointmentResponse = {
              id: Date.now(),
              professional_id: professional.id,
              customer_id: 1,
              service_id: service.id,
              start_time: startTimeIso,
              end_time: startTimeIso,
              status: AppointmentStatus.BOOKED,
              payment_type: PaymentType.AVULSO_LOCAL,
              created_at: new Date().toISOString(),
            };
            setConfirmedAppointment(simulated);
            onSuccess(simulated);
          }
        } else {
          const simulated: AppointmentResponse = {
            id: Date.now(),
            professional_id: professional.id,
            customer_id: 1,
            service_id: service.id,
            start_time: startTimeIso,
            end_time: startTimeIso,
            status: AppointmentStatus.BOOKED,
            payment_type: PaymentType.AVULSO_LOCAL,
            created_at: new Date().toISOString(),
          };
          setConfirmedAppointment(simulated);
          onSuccess(simulated);
        }
      }
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      const statusCode = err?.response?.status;
      const detailMsg = err?.response?.data?.detail;

      if (
        statusCode === 409 ||
        (typeof detailMsg === 'string' &&
          detailMsg.toLowerCase().includes('not available'))
      ) {
        setIsConflict(true);
        setErrorMessage(
          'Este horário acabou de ser reservado por outro cliente. Por favor, selecione outro horário.'
        );
      } else {
        setErrorMessage(
          detailMsg ||
            err?.message ||
            'Não foi possível concluir o agendamento. Verifique suas informações e tente novamente.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`
          relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl
          overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slide-up sm:animate-none
          ${className}
        `}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">
              Confirmar Agendamento
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. Success Feedback View */}
          {confirmedAppointment ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-100">
                  Agendamento Confirmado!
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Seu horário foi reservado com sucesso no sistema.
                </p>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 text-left space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Serviço:</span>
                  <span className="font-semibold text-zinc-200">{service.name}</span>
                </div>
                {professional && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Profissional:</span>
                    <span className="font-semibold text-zinc-200">
                      {professional.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Data e Horário:</span>
                  <span className="font-semibold text-amber-400">
                    {formatFriendlyDateTime(selectedDate, slot.start_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-400">Forma de Pagamento:</span>
                  <Badge
                    variant={
                      confirmedAppointment.payment_type === PaymentType.PACKAGE_CREDIT
                        ? 'brand'
                        : 'neutral'
                    }
                  >
                    {confirmedAppointment.payment_type === PaymentType.PACKAGE_CREDIT
                      ? '1 Crédito Debitado'
                      : 'Pagamento no Local'}
                  </Badge>
                </div>
              </div>

              <div className="pt-2">
                <Button fullWidth variant="primary" onClick={handleClose}>
                  Concluir
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 2. Service & Professional Summary Card */}
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-zinc-100">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <Clock size={13} className="text-amber-400" />
                      <span>{service.duration_minutes} min</span>
                      {professional && (
                        <>
                          <span>•</span>
                          <User size={13} className="text-amber-400" />
                          <span>{professional.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-amber-400">
                      {formatCurrencyBRL(service.price)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Data e Horário:</span>
                  <span className="font-semibold text-zinc-200">
                    {formatFriendlyDateTime(selectedDate, slot.start_time)}
                  </span>
                </div>
              </div>

              {/* 3. 409 Conflict Banner */}
              {isConflict && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <AlertTriangle size={18} />
                    <span>Horário Indisponível</span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {errorMessage}
                  </p>
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleConflictResolve}
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Escolher Outro Horário
                    </Button>
                  </div>
                </div>
              )}

              {/* 4. General Error Banner */}
              {!isConflict && errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 5. Payment Selection (Only when not in conflict) */}
              {!isConflict && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                    Forma de Pagamento
                  </label>

                  {/* Option 1: Package Credit */}
                  <div
                    onClick={() => {
                      if (totalCredits > 0) setPaymentOption('CREDIT');
                    }}
                    role="button"
                    tabIndex={totalCredits > 0 ? 0 : -1}
                    className={`
                      p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none
                      ${
                        paymentOption === 'CREDIT'
                          ? 'bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                      }
                      ${totalCredits === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                        ${
                          paymentOption === 'CREDIT'
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-400'
                        }
                      `}
                    >
                      <Wallet size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-zinc-200">
                          Usar Crédito do Pacote
                        </span>
                        {totalCredits > 0 ? (
                          <Badge variant="brand" size="sm">
                            <Sparkles size={10} className="inline mr-1" />
                            {totalCredits} {totalCredits === 1 ? 'crédito' : 'créditos'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Sem créditos
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-normal">
                        {totalCredits > 0
                          ? '1 crédito será deduzido atomicamente da sua carteira.'
                          : 'Você não possui créditos ativos para este serviço.'}
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Pay at Venue */}
                  <div
                    onClick={() => setPaymentOption('LOCAL')}
                    role="button"
                    tabIndex={0}
                    className={`
                      p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none
                      ${
                        paymentOption === 'LOCAL'
                          ? 'bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                  >
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                        ${
                          paymentOption === 'LOCAL'
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-400'
                        }
                      `}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-zinc-200">
                          Pagar no Local
                        </span>
                        <span className="text-xs font-semibold text-zinc-400">
                          {formatCurrencyBRL(service.price)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-normal">
                        Efetue o pagamento diretamente na barbearia após o corte.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions (Only if not already confirmed) */}
        {!confirmedAppointment && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-900/50">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            {!isConflict && (
              <Button
                variant="primary"
                onClick={() => handleSubmit()}
                isLoading={isSubmitting}
                loadingText="Confirmando..."
                disabled={
                  paymentOption === 'CREDIT' && totalCredits === 0
                }
              >
                {paymentOption === 'CREDIT'
                  ? 'Confirmar com Crédito'
                  : 'Confirmar Agendamento'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
