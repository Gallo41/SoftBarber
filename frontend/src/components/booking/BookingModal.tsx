import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`
          relative w-full max-w-lg bg-card border-[1.5px] border-ink rounded-sm shadow-stamp-lg
          overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slide-up sm:animate-none pt-6
          ${className}
        `}
      >
        {/* Barber pole top stripe */}
        <div className="pole-stripe absolute top-0 left-0 right-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-[1.5px] border-ink">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-pole-red" />
            <h2 className="font-display text-xl text-ink">
              Confirmar Agendamento
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-ink-muted hover:text-ink p-1 rounded-sm hover:bg-paper-dark border border-transparent hover:border-ink transition-colors disabled:opacity-50"
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
              <div className="w-16 h-16 rounded-sm bg-moss-tint border-[1.5px] border-moss text-moss flex items-center justify-center mx-auto shadow-stamp-sm">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="font-display text-2xl text-ink">
                  Agendamento Confirmado!
                </h3>
                <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-1">
                  Seu horário foi reservado com sucesso no sistema.
                </p>
              </div>

              <div className="card-paper p-4 text-left space-y-2.5 text-sm">
                <div className="flex justify-between pb-1.5 border-b border-dashed border-ink-line">
                  <span className="sign-label">Serviço:</span>
                  <span className="font-semibold text-ink">{service.name}</span>
                </div>
                {professional && (
                  <div className="flex justify-between pb-1.5 border-b border-dashed border-ink-line">
                    <span className="sign-label">Profissional:</span>
                    <span className="font-semibold text-ink">
                      {professional.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pb-1.5 border-b border-dashed border-ink-line">
                  <span className="sign-label">Data e Horário:</span>
                  <span className="font-semibold text-pole-red font-sign uppercase">
                    {formatFriendlyDateTime(selectedDate, slot.start_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="sign-label">Forma de Pagamento:</span>
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
              <div className="card-paper p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg text-ink">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-2 font-sign uppercase tracking-wider text-xs text-ink-soft mt-0.5">
                      <Clock size={12} className="text-pole-red" />
                      <span>{service.duration_minutes} min</span>
                      {professional && (
                        <>
                          <span>•</span>
                          <User size={12} className="text-ink-muted" />
                          <span>{professional.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-xl text-pole-red">
                      {formatCurrencyBRL(service.price)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-ink-line flex items-center justify-between text-xs">
                  <span className="sign-label">Data e Horário:</span>
                  <span className="font-semibold text-ink font-sign uppercase">
                    {formatFriendlyDateTime(selectedDate, slot.start_time)}
                  </span>
                </div>
              </div>

              {/* 3. 409 Conflict Banner */}
              {isConflict && (
                <div className="p-4 rounded-sm bg-mustard-tint border-[1.5px] border-mustard text-left space-y-2">
                  <div className="flex items-center gap-2 text-mustard font-sign uppercase tracking-wider font-semibold text-sm">
                    <AlertTriangle size={18} />
                    <span>Horário Indisponível</span>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">
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
                <div className="p-3.5 rounded-sm bg-pole-red-tint border-[1.5px] border-pole-red flex items-start gap-2.5 text-xs text-pole-red">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 5. Payment Selection (Only when not in conflict) */}
              {!isConflict && (
                <div className="space-y-3">
                  <label className="sign-label block">
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
                      p-3.5 rounded-sm border-[1.5px] transition-all cursor-pointer flex items-start gap-3 select-none
                      ${
                        paymentOption === 'CREDIT'
                          ? 'border-pole-red bg-card shadow-stamp-sm ring-1 ring-pole-red'
                          : 'bg-paper-dark border-ink-line hover:border-ink'
                      }
                      ${totalCredits === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div
                      className={`
                        w-9 h-9 rounded-sm border border-ink flex items-center justify-center shrink-0 mt-0.5
                        ${
                          paymentOption === 'CREDIT'
                            ? 'bg-pole-red text-card'
                            : 'bg-card text-ink'
                        }
                      `}
                    >
                      <Wallet size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-sign uppercase tracking-wider font-semibold text-sm text-ink">
                          Usar Crédito do Pacote
                        </span>
                        {totalCredits > 0 ? (
                          <Badge variant="brand" size="sm">
                            {totalCredits} {totalCredits === 1 ? 'crédito' : 'créditos'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Sem créditos
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-soft mt-1 leading-normal">
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
                      p-3.5 rounded-sm border-[1.5px] transition-all cursor-pointer flex items-start gap-3 select-none
                      ${
                        paymentOption === 'LOCAL'
                          ? 'border-pole-red bg-card shadow-stamp-sm ring-1 ring-pole-red'
                          : 'bg-paper-dark border-ink-line hover:border-ink'
                      }
                    `}
                  >
                    <div
                      className={`
                        w-9 h-9 rounded-sm border border-ink flex items-center justify-center shrink-0 mt-0.5
                        ${
                          paymentOption === 'LOCAL'
                            ? 'bg-pole-red text-card'
                            : 'bg-card text-ink'
                        }
                      `}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-sign uppercase tracking-wider font-semibold text-sm text-ink">
                          Pagar no Local
                        </span>
                        <span className="font-display text-sm text-pole-red font-semibold">
                          {formatCurrencyBRL(service.price)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft mt-1 leading-normal">
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
          <div className="px-6 py-4 border-t-[1.5px] border-ink flex items-center justify-end gap-3 bg-paper-dark">
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
