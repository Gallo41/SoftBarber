import React from 'react';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  Wallet,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import {
  AppointmentResponse,
  AppointmentStatus,
  PaymentType,
} from '../../types/api';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export interface AppointmentCardProps {
  appointment: AppointmentResponse;
  serviceName?: string;
  professionalName?: string;
  servicesMap?: Record<number, string>;
  professionalsMap?: Record<number, string>;
  cancellationWindowHours?: number; // default: 2 hours
  onCancelClick?: (appointment: AppointmentResponse) => void;
  className?: string;
}

/**
 * Formats ISO date string to Brazilian Portuguese full date format.
 * Example: "Sexta-feira, 16/10/2026"
 */
export function formatAppointmentDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
    const datePart = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);

    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalizedWeekday}, ${datePart}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats time from ISO string to 24-hour HH:mm.
 */
export function formatAppointmentTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr.slice(11, 16) || dateStr;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Formats a start and end ISO time range (e.g., "14:00 - 14:45").
 */
export function formatAppointmentTimeRange(
  startIso: string,
  endIso?: string | null
): string {
  const start = formatAppointmentTime(startIso);
  if (!endIso) return start;
  const end = formatAppointmentTime(endIso);
  return `${start} - ${end}`;
}

/**
 * Formats full timestamp for cancelled_at or created_at.
 */
export function formatFullTimestamp(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export interface RefundEligibilityInfo {
  isEligible: boolean;
  isPast: boolean;
  diffHours: number;
  diffMinutes: number;
  formattedRemaining: string;
}

/**
 * Calculates refund eligibility based on the 2-hour cancellation deadline.
 */
export function calculateRefundEligibility(
  startIso: string,
  cancellationWindowHours: number = 2
): RefundEligibilityInfo {
  const startTime = new Date(startIso).getTime();
  const now = Date.now();
  const diffMs = startTime - now;
  const isPast = diffMs <= 0;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = diffMs / (1000 * 60 * 60);

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  let formattedRemaining = '';
  if (isPast) {
    formattedRemaining = 'Horário já iniciado';
  } else if (hours > 0) {
    formattedRemaining = `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  } else {
    formattedRemaining = `${diffMinutes}min`;
  }

  const isEligible = !isPast && diffHours >= cancellationWindowHours;

  return {
    isEligible,
    isPast,
    diffHours,
    diffMinutes,
    formattedRemaining,
  };
}

/**
 * Returns visual configurations and descriptive labels for payment methods.
 */
export function getPaymentBadgeProps(paymentType: PaymentType) {
  switch (paymentType) {
    case PaymentType.PACKAGE_CREDIT:
      return {
        label: 'Crédito de Pacote',
        variant: 'brand' as const,
        icon: Wallet,
      };
    case PaymentType.AVULSO_LOCAL:
      return {
        label: 'Pagamento no Local',
        variant: 'neutral' as const,
        icon: Banknote,
      };
    case PaymentType.AVULSO_ONLINE:
      return {
        label: 'Pagamento Online',
        variant: 'info' as const,
        icon: CreditCard,
      };
    default:
      return {
        label: paymentType,
        variant: 'neutral' as const,
        icon: CreditCard,
      };
  }
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  serviceName,
  professionalName,
  servicesMap = {},
  professionalsMap = {},
  cancellationWindowHours = 2,
  onCancelClick,
  className = '',
}) => {
  const resolvedServiceName =
    serviceName ??
    servicesMap[appointment.service_id] ??
    `Serviço #${appointment.service_id}`;

  const resolvedProfessionalName =
    professionalName ??
    professionalsMap[appointment.professional_id] ??
    `Profissional #${appointment.professional_id}`;

  const paymentConfig = getPaymentBadgeProps(appointment.payment_type);
  const PaymentIcon = paymentConfig.icon;

  const refundInfo = calculateRefundEligibility(
    appointment.start_time,
    cancellationWindowHours
  );

  const isCancellableStatus =
    appointment.status === AppointmentStatus.BOOKED ||
    appointment.status === AppointmentStatus.CONFIRMED;

  const canCancel = isCancellableStatus && !refundInfo.isPast;
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;
  const isPackagePayment = appointment.payment_type === PaymentType.PACKAGE_CREDIT;

  return (
    <div
      className={`
        bg-zinc-900 border border-zinc-800 rounded-2xl p-5
        hover:border-zinc-700/80 transition-all duration-200
        shadow-sm shadow-black/20 flex flex-col justify-between
        ${className}
      `}
    >
      <div>
        {/* Top Header: Date/Time & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-zinc-100 text-sm sm:text-base leading-tight">
                {formatAppointmentDate(appointment.start_time)}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 font-mono">
                <Clock size={12} className="text-amber-400/80" />
                <span>
                  {formatAppointmentTimeRange(
                    appointment.start_time,
                    appointment.end_time
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Badge status={appointment.status} />
          </div>
        </div>

        {/* Appointment Details */}
        <div className="space-y-2.5 py-3 border-y border-zinc-800/80 text-sm">
          {/* Service */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <Scissors size={14} className="text-amber-400 shrink-0" />
              <span>Serviço</span>
            </div>
            <span className="font-medium text-zinc-200 text-right">
              {resolvedServiceName}
            </span>
          </div>

          {/* Professional */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <User size={14} className="text-zinc-500 shrink-0" />
              <span>Profissional</span>
            </div>
            <span className="text-zinc-300 text-right">
              {resolvedProfessionalName}
            </span>
          </div>

          {/* Payment Type */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <PaymentIcon size={14} className="text-zinc-500 shrink-0" />
              <span>Pagamento</span>
            </div>
            <Badge variant={paymentConfig.variant} size="sm" dot={false}>
              {paymentConfig.label}
            </Badge>
          </div>
        </div>

        {/* Conditional Banners: Refund status or Cancellation note */}
        {isCancelled && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
            <div className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Ban size={13} />
              <span>Horário Cancelado</span>
              {appointment.cancelled_at && (
                <span className="text-zinc-400 font-normal">
                  • {formatFullTimestamp(appointment.cancelled_at)}
                </span>
              )}
            </div>
            {appointment.cancellation_reason && (
              <p className="text-zinc-300 italic">
                Motivo: &quot;{appointment.cancellation_reason}&quot;
              </p>
            )}
          </div>
        )}

        {/* Dynamic Refund Notice Pill for Active Bookings */}
        {canCancel && isPackagePayment && (
          <div className="mt-3.5">
            {refundInfo.isEligible ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>
                  Estorno de crédito garantido (restam {refundInfo.formattedRemaining})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                <span>
                  Atenção: menos de {cancellationWindowHours}h do início (sem estorno de crédito)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {canCancel && onCancelClick && (
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancelClick(appointment)}
            className="hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 text-zinc-300"
            leftIcon={<Ban size={14} />}
          >
            Cancelar Horário
          </Button>
        </div>
      )}
    </div>
  );
};
