import React from 'react';
import { Clock, Scissors, Sparkles, CheckCircle2 } from 'lucide-react';
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
        relative rounded-xl p-5 transition-all duration-200 cursor-pointer select-none
        border flex flex-col justify-between
        ${
          isSelected
            ? 'bg-zinc-900/95 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
            : 'bg-zinc-900/80 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/95 hover:shadow-md'
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
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }
              `}
            >
              <Scissors size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-zinc-100 leading-snug">
                {service.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                <Clock size={13} className="text-amber-400/90" />
                <span>{service.duration_minutes} min de duração</span>
              </div>
            </div>
          </div>

          {isSelected && (
            <div className="text-amber-400">
              <CheckCircle2 size={20} />
            </div>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
            {service.description}
          </p>
        )}
      </div>

      {/* Bottom Section: Price / Credits & Action Button */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 mt-2">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider font-medium text-zinc-500">
            Valor
          </span>
          <span className="text-lg sm:text-xl font-bold text-amber-400">
            {formatCurrencyBRL(service.price)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {creditsAvailable > 0 && (
            <Badge variant="brand" size="sm" title="Créditos disponíveis no seu pacote">
              <Sparkles size={11} className="text-amber-400 inline mr-1" />
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
