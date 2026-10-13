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
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
  },
  warning: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/70',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-rose-50 text-rose-700 border-rose-200/70',
    dot: 'bg-rose-500',
  },
  info: {
    container: 'bg-sky-50 text-sky-700 border-sky-200/70',
    dot: 'bg-sky-500',
  },
  brand: {
    container: 'bg-blue-50 text-blue-700 border-blue-200/70',
    dot: 'bg-blue-500',
  },
  neutral: {
    container: 'bg-slate-100 text-slate-700 border-slate-200/70',
    dot: 'bg-slate-400',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1.5',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  size = 'md',
  dot = true,
  children,
  className = '',
  ...rest
}) => {
  // Resolve configuration from status string if provided, fallback to neutral
  const config = status ? statusConfigMap[status] : undefined;
  const effectiveVariant: BadgeVariant = variant ?? config?.variant ?? 'neutral';
  const label = children ?? config?.label ?? status ?? '';

  const styles = variantClasses[effectiveVariant];

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        tracking-tight select-none
        ${styles.container}
        ${sizeClasses[size]}
        ${className}
      `}
      {...rest}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};

export default Badge;
