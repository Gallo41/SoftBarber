import React, { useState } from 'react';
import { Package, Clock, CheckCircle2 } from 'lucide-react';
import { PackageResponse } from '../../types/api';
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

export interface PackageCardProps {
  pkg: PackageResponse;
  servicesMap?: Record<number, string>;
  onPurchase: (packageId: number) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  servicesMap = {},
  onPurchase,
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const effectiveLoading = isLoading || internalLoading;
  const isPurchaseDisabled = disabled || effectiveLoading || !pkg.is_active;

  const handlePurchase = async () => {
    if (isPurchaseDisabled) return;

    try {
      setInternalLoading(true);
      await onPurchase(pkg.id);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div
      className={`
        card-paper p-6 shadow-stamp-sm hover:shadow-stamp
        flex flex-col justify-between transition-all duration-150
        ${className}
      `}
    >
      {/* Top Header & Price */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink shrink-0 shadow-stamp-sm">
              <Package size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl text-ink leading-snug">
                {pkg.name}
              </h3>
              <div className="flex items-center gap-1.5 font-sign uppercase tracking-wider text-xs text-ink-muted mt-0.5">
                <Clock size={12} className="text-pole-red" />
                <span>Validade: {pkg.validity_days} dias</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {pkg.description && (
          <p className="text-xs sm:text-sm text-ink-soft mb-4 line-clamp-2">
            {pkg.description}
          </p>
        )}

        {/* Price display - Voucher ticket cutout style */}
        <div className="mb-5 p-3 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-baseline justify-between shadow-sm">
          <span className="sign-label">
            Preço do Pacote
          </span>
          <span className="font-display text-2xl text-pole-red">
            {formatCurrencyBRL(pkg.price)}
          </span>
        </div>

        {/* Included Services List */}
        <div className="space-y-2 mb-6">
          <div className="sign-label flex items-center gap-1.5">
            <span>Sessões Inclusas</span>
          </div>

          <ul className="space-y-2">
            {pkg.items && pkg.items.length > 0 ? (
              pkg.items.map((item) => {
                const serviceName =
                  servicesMap[item.service_id] ?? `Serviço #${item.service_id}`;
                return (
                  <li
                    key={item.id || item.service_id}
                    className="flex items-center gap-2 text-sm text-ink pb-1 border-b border-dashed border-ink-line"
                  >
                    <CheckCircle2
                      size={15}
                      className="text-moss shrink-0"
                    />
                    <span className="font-sign uppercase font-bold text-pole-red">
                      {item.quantity}x
                    </span>
                    <span className="text-ink font-medium">{serviceName}</span>
                  </li>
                );
              })
            ) : (
              <li className="text-xs text-ink-muted italic">
                Nenhum serviço discriminado
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t-[1.5px] border-ink">
        <Button
          variant="primary"
          fullWidth
          isLoading={effectiveLoading}
          loadingText="Processando compra..."
          disabled={isPurchaseDisabled}
          onClick={handlePurchase}
        >
          {pkg.is_active ? 'Comprar Pacote' : 'Pacote Indisponível'}
        </Button>
      </div>
    </div>
  );
};

export default PackageCard;
