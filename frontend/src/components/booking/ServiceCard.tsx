import React from 'react';
import { Clock, Scissors, CheckCircle2 } from 'lucide-react';
import { Service } from '../../types/api';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

/**
 * Formats a monetary value to Brazilian Real currency string (R$ 0,00).
 */
export function formatCurrencyBRL(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericValue);
}

export interface ServiceCardProps {
  service: Service;
  onSelect?: (service: Service) => void;
  isSelected?: boolean;
  creditsAvailable?: number;
  disabled?: boolean;
  className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onSelect,
  isSelected = false,
  creditsAvailable = 0,
  disabled = false,
  className = '',
}) => {
  const handleSelect = () => {
    if (!disabled && onSelect) {
      onSelect(service);
    }
  };

  return (
    <div
      onClick={handleSelect}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleSelect();
        }
      }}
      className={`
        card-clean p-5 transition-all duration-150 cursor-pointer select-none
        flex flex-col justify-between
        ${
          isSelected
            ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
            : 'hover:border-slate-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
    >
      {/* Top Header: Icon, Name & Credits Badge */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors
                ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-800'
                }
              `}
            >
              <Scissors size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 leading-snug">
                {service.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                <Clock size={12} className="text-slate-400" />
                <span>{service.duration_minutes} min de duração</span>
              </div>
            </div>
          </div>

          {isSelected && (
            <div className="text-slate-900">
              <CheckCircle2 size={20} />
            </div>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="text-xs sm:text-sm text-slate-500 mb-4 line-clamp-2">
            {service.description}
          </p>
        )}
      </div>

      {/* Bottom Section: Price / Credits & Action Button */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 mt-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Valor
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyBRL(service.price)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {creditsAvailable > 0 && (
            <Badge variant="brand" size="sm" title="Créditos disponíveis no seu pacote">
              {creditsAvailable} {creditsAvailable === 1 ? 'crédito' : 'créditos'}
            </Badge>
          )}

          <Button
            size="sm"
            variant={isSelected ? 'primary' : 'outline'}
            onClick={(e) => {
              e.stopPropagation();
              handleSelect();
            }}
            disabled={disabled}
          >
            {isSelected ? 'Selecionado' : 'Agendar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
