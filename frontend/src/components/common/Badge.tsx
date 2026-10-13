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
    container: 'bg-moss-tint text-moss border-moss',
    dot: 'bg-moss',
  },
  warning: {
    container: 'bg-mustard-tint text-mustard border-mustard',
    dot: 'bg-mustard',
  },
  danger: {
    container: 'bg-pole-red-tint text-pole-red border-pole-red',
    dot: 'bg-pole-red',
  },
  info: {
    container: 'bg-pole-blue-tint text-pole-blue border-pole-blue',
    dot: 'bg-pole-blue',
  },
  brand: {
    container: 'bg-ink text-card border-ink',
    dot: 'bg-pole-red',
  },
  neutral: {
    container: 'bg-paper-dark text-ink-soft border-ink-muted',
    dot: 'bg-ink-muted',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[0.68rem]',
  md: 'px-2.5 py-1 text-xs',
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
        inline-flex items-center gap-1.5 rounded-sm border
        font-sign uppercase tracking-[0.1em] font-medium
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
