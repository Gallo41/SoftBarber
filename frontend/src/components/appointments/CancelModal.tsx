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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        className={`
          relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl
          overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slide-up sm:animate-none
          ${className}
        `}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Ban size={16} />
            </div>
            <h2
              id="cancel-modal-title"
              className="text-base sm:text-lg font-semibold text-zinc-100"
            >
              Cancelar Agendamento
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">
                  Agendamento Cancelado!
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  O horário foi desmarcado na agenda do profissional.
                </p>
              </div>

              {isPackagePayment && refundInfo.isEligible && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 text-left">
                  <RefreshCw size={18} className="shrink-0 text-emerald-400" />
                  <span>
                    <strong>1 crédito estornado:</strong> Seu crédito de pacote
                    foi devolvido com sucesso à sua carteira.
                  </span>
                </div>
              )}

              {isPackagePayment && !refundInfo.isEligible && (
                <div className="p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 text-xs text-left">
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
              {/* Appointment summary box */}
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Scissors size={13} className="text-amber-400" />
                    Serviço:
                  </span>
                  <span className="font-semibold text-zinc-200">
                    {resolvedServiceName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <User size={13} className="text-zinc-400" />
                    Profissional:
                  </span>
                  <span className="font-semibold text-zinc-200">
                    {resolvedProfessionalName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Calendar size={13} className="text-zinc-400" />
                    Data e Horário:
                  </span>
                  <span className="font-semibold text-amber-400">
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
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-emerald-400">
                      <RefreshCw size={15} className="shrink-0" />
                      <span>Estorno de Crédito Garantido</span>
                    </div>
                    <p className="text-emerald-300/90 leading-relaxed">
                      Você está cancelando com mais de {cancellationWindowHours} horas
                      de antecedência (faltam {refundInfo.formattedRemaining}). O
                      crédito de <strong>1 sessão</strong> será devolvido à sua
                      carteira de pacotes.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-amber-400">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>Atenção: Cancelamento sem Estorno</span>
                    </div>
                    <p className="text-amber-300/90 leading-relaxed">
                      Faltam menos de {cancellationWindowHours} horas para o horário
                      (restam {refundInfo.formattedRemaining}). Segundo o
                      regulamento do salão,{' '}
                      <strong>o crédito não será devolvido</strong> à sua carteira.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700 text-zinc-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-zinc-200">
                    <Clock size={14} className="text-zinc-400" />
                    <span>Cancelamento de Agendamento Avulso</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Este agendamento foi registrado com pagamento no local/online. O
                    horário será liberado na agenda.
                  </p>
                </div>
              )}

              {/* Reason input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="cancellation-reason"
                  className="block text-xs font-medium text-zinc-300"
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
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none disabled:opacity-50"
                  maxLength={255}
                />
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
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
