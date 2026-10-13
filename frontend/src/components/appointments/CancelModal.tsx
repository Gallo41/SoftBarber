import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Ban,
  Scissors,
  User,
} from 'lucide-react';
import {
  AppointmentResponse,
  PaymentType,
} from '../../types/api';
import { cancelAppointment } from '../../api/appointments';
import { Button } from '../common/Button';
import {
  formatAppointmentDate,
  formatAppointmentTimeRange,
  calculateRefundEligibility,
} from './AppointmentCard';

export interface CancelModalProps {
  isOpen: boolean;
  appointment: AppointmentResponse | null;
  serviceName?: string;
  professionalName?: string;
  servicesMap?: Record<number, string>;
  professionalsMap?: Record<number, string>;
  cancellationWindowHours?: number; // default: 2
  onClose: () => void;
  onCancelled: (updatedAppointment: AppointmentResponse) => void;
  className?: string;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  appointment,
  serviceName,
  professionalName,
  servicesMap = {},
  professionalsMap = {},
  cancellationWindowHours = 2,
  onClose,
  onCancelled,
  className = '',
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelledResult, setCancelledResult] =
    useState<AppointmentResponse | null>(null);

  // Reset state on modal open/appointment change
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setIsSubmitting(false);
      setErrorMessage(null);
      setCancelledResult(null);
    }
  }, [isOpen, appointment?.id]);

  if (!isOpen || !appointment) {
    return null;
  }

  const resolvedServiceName =
    serviceName ??
    servicesMap[appointment.service_id] ??
    `Serviço #${appointment.service_id}`;

  const resolvedProfessionalName =
    professionalName ??
    professionalsMap[appointment.professional_id] ??
    `Profissional #${appointment.professional_id}`;

  const refundInfo = calculateRefundEligibility(
    appointment.start_time,
    cancellationWindowHours
  );

  const isPackagePayment =
    appointment.payment_type === PaymentType.PACKAGE_CREDIT;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleConfirmCancel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!appointment || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const trimmedReason = reason.trim();
      const updated = await cancelAppointment(appointment.id, {
        cancellation_reason: trimmedReason.length > 0 ? trimmedReason : null,
      });

      setCancelledResult(updated);
      onCancelled(updated);
    } catch (err: unknown) {
      let message =
        'Não foi possível cancelar o agendamento. Tente novamente mais tarde.';
      if (err && typeof err === 'object') {
        const anyErr = err as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        if (anyErr.response?.data?.detail) {
          message = anyErr.response.data.detail;
        } else if (anyErr.message) {
          message = anyErr.message;
        }
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        className={`
          relative w-full max-w-md bg-card border-[1.5px] border-ink rounded-sm shadow-stamp-lg
          overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slide-up sm:animate-none pt-6
          ${className}
        `}
      >
        {/* Barber pole top stripe */}
        <div className="pole-stripe absolute top-0 left-0 right-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-[1.5px] border-ink">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-pole-red-tint border border-pole-red text-pole-red flex items-center justify-center">
              <Ban size={16} strokeWidth={2} />
            </div>
            <h2
              id="cancel-modal-title"
              className="font-display text-lg sm:text-xl text-ink"
            >
              Cancelar Agendamento
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-ink-muted hover:text-ink p-1 rounded-sm hover:bg-paper-dark border border-transparent hover:border-ink transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* View 1: Success State */}
          {cancelledResult ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-sm bg-moss-tint border-[1.5px] border-moss text-moss flex items-center justify-center mx-auto shadow-stamp-sm">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="font-display text-xl text-ink">
                  Agendamento Cancelado!
                </h3>
                <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-1">
                  O horário foi desmarcado na agenda do profissional.
                </p>
              </div>

              {isPackagePayment && refundInfo.isEligible && (
                <div className="p-3.5 rounded-sm bg-moss-tint border-[1.5px] border-moss text-moss text-xs sm:text-sm flex items-center gap-2.5 text-left">
                  <RefreshCw size={18} className="shrink-0 text-moss" />
                  <span>
                    <strong>1 crédito estornado:</strong> Seu crédito de pacote
                    foi devolvido com sucesso à sua carteira.
                  </span>
                </div>
              )}

              {isPackagePayment && !refundInfo.isEligible && (
                <div className="p-3.5 rounded-sm bg-paper-dark border-[1.5px] border-ink text-ink-soft text-xs text-left">
                  Cancelamento realizado sem estorno de créditos por exceder o
                  prazo limite de {cancellationWindowHours}h.
                </div>
              )}

              <div className="pt-2">
                <Button variant="primary" fullWidth onClick={handleClose}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            /* View 2: Confirmation & Refund Policy Form */
            <form onSubmit={handleConfirmCancel} className="space-y-4">
              {/* Appointment summary box - Vintage ticket receipt style */}
              <div className="card-paper p-4 text-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-ink-line">
                  <span className="sign-label flex items-center gap-1.5">
                    <Scissors size={13} className="text-pole-red" />
                    Serviço:
                  </span>
                  <span className="font-semibold text-ink">
                    {resolvedServiceName}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-ink-line">
                  <span className="sign-label flex items-center gap-1.5">
                    <User size={13} className="text-ink-soft" />
                    Profissional:
                  </span>
                  <span className="font-semibold text-ink">
                    {resolvedProfessionalName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="sign-label flex items-center gap-1.5">
                    <Calendar size={13} className="text-ink-soft" />
                    Data e Horário:
                  </span>
                  <span className="font-semibold text-pole-red font-sign uppercase">
                    {formatAppointmentDate(appointment.start_time)} às{' '}
                    {formatAppointmentTimeRange(
                      appointment.start_time,
                      appointment.end_time
                    )}
                  </span>
                </div>
              </div>

              {/* Dynamic Refund Rule Notice */}
              {isPackagePayment ? (
                refundInfo.isEligible ? (
                  <div className="p-3.5 rounded-sm bg-moss-tint border-[1.5px] border-moss text-moss text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-sign uppercase tracking-wider font-semibold text-moss">
                      <RefreshCw size={15} className="shrink-0" />
                      <span>Estorno de Crédito Garantido</span>
                    </div>
                    <p className="leading-relaxed">
                      Você está cancelando com mais de {cancellationWindowHours} horas
                      de antecedência (faltam {refundInfo.formattedRemaining}). O
                      crédito de <strong>1 sessão</strong> será devolvido à sua
                      carteira de pacotes.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-sm bg-mustard-tint border-[1.5px] border-mustard text-mustard text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-sign uppercase tracking-wider font-semibold text-mustard">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>Atenção: Cancelamento sem Estorno</span>
                    </div>
                    <p className="leading-relaxed">
                      Faltam menos de {cancellationWindowHours} horas para o horário
                      (restam {refundInfo.formattedRemaining}). Segundo o
                      regulamento do salão,{' '}
                      <strong>o crédito não será devolvido</strong> à sua carteira.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-sm bg-paper-dark border-[1.5px] border-ink text-ink-soft text-xs space-y-1">
                  <div className="flex items-center gap-2 font-sign uppercase tracking-wider font-semibold text-ink">
                    <Clock size={14} className="text-ink-muted" />
                    <span>Cancelamento de Agendamento Avulso</span>
                  </div>
                  <p className="leading-relaxed">
                    Este agendamento foi registrado com pagamento no local/online. O
                    horário será liberado na agenda.
                  </p>
                </div>
              )}

              {/* Reason input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="cancellation-reason"
                  className="block sign-label"
                >
                  Motivo do cancelamento (opcional):
                </label>
                <textarea
                  id="cancellation-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Tive um imprevisto de trabalho e não poderei comparecer..."
                  disabled={isSubmitting}
                  className="input-paper text-xs sm:text-sm resize-none disabled:opacity-50"
                  maxLength={255}
                />
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-sm bg-pole-red-tint border-[1.5px] border-pole-red text-pole-red text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Manter Agendamento
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  isLoading={isSubmitting}
                  loadingText="Cancelando..."
                  className="w-full sm:w-auto"
                  leftIcon={<Ban size={15} />}
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelModal;
