import React from 'react';
import { PackageStatus, AppointmentStatus } from '../../types/api';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: PackageStatus | AppointmentStatus | string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: React.ReactNode;
}

// Map each known status to an appropriate visual variant and default label
const statusConfigMap: Record<
  string,
  { variant: BadgeVariant; label: string }
> = {
  // Package statuses
  [PackageStatus.ACTIVE]: { variant: 'success', label: 'Ativo' },
  [PackageStatus.EXPIRED]: { variant: 'neutral', label: 'Expirado' },
  [PackageStatus.EXHAUSTED]: { variant: 'warning', label: 'Esgotado' },
  [PackageStatus.CANCELLED]: { variant: 'danger', label: 'Cancelado' },

  // Appointment statuses
  [AppointmentStatus.BOOKED]: { variant: 'info', label: 'Agendado' },
  [AppointmentStatus.CONFIRMED]: { variant: 'brand', label: 'Confirmado' },
  [AppointmentStatus.COMPLETED]: { variant: 'success', label: 'Concluído' },
  [AppointmentStatus.NO_SHOW]: { variant: 'danger', label: 'Não Compareceu' },
};

const variantClasses: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  warning: {
    container: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    dot: 'bg-amber-400',
  },
  danger: {
    container: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    dot: 'bg-rose-400',
  },
  info: {
    container: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    dot: 'bg-sky-400',
  },
  brand: {
    container: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    dot: 'bg-amber-400',
  },
  neutral: {
    container: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    dot: 'bg-zinc-400',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs sm:text-sm',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  size = 'sm',
  dot = true,
  children,
  className = '',
  ...rest
}) => {
  // Determine variant and label
  const resolvedStatusConfig = status ? statusConfigMap[status] : undefined;
  const effectiveVariant = variant || resolvedStatusConfig?.variant || 'neutral';
  const displayLabel = children ?? resolvedStatusConfig?.label ?? status ?? '';

  const { container: containerStyle, dot: dotStyle } = variantClasses[effectiveVariant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        transition-colors select-none
        ${containerStyle}
        ${sizeClasses[size]}
        ${className}
      `}
      {...rest}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
