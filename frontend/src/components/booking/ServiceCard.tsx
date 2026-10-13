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
        card-paper p-5 transition-all duration-150 cursor-pointer select-none
        flex flex-col justify-between
        ${
          isSelected
            ? 'border-pole-red shadow-stamp ring-1 ring-pole-red'
            : 'shadow-stamp-sm hover:shadow-stamp hover:border-ink'
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
                w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border-[1.5px] border-ink transition-colors shadow-stamp-sm
                ${
                  isSelected
                    ? 'bg-pole-red text-card border-ink'
                    : 'bg-paper-dark text-ink'
                }
              `}
            >
              <Scissors size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg text-ink leading-snug">
                {service.name}
              </h3>
              <div className="flex items-center gap-1.5 font-sign uppercase tracking-wider text-xs text-ink-muted mt-0.5">
                <Clock size={12} className="text-pole-red" />
                <span>{service.duration_minutes} min de duração</span>
              </div>
            </div>
          </div>

          {isSelected && (
            <div className="text-pole-red">
              <CheckCircle2 size={20} />
            </div>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="text-xs sm:text-sm text-ink-soft mb-4 line-clamp-2">
            {service.description}
          </p>
        )}
      </div>

      {/* Bottom Section: Price / Credits & Action Button */}
      <div className="pt-3 border-t-[1.5px] border-ink flex items-center justify-between gap-3 mt-2">
        <div className="flex flex-col">
          <span className="sign-label">
            Valor
          </span>
          <span className="font-display text-xl sm:text-2xl text-pole-red">
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
