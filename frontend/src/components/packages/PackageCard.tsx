import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, Sparkles } from 'lucide-react';
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
        bg-zinc-900/90 border border-zinc-800 rounded-xl p-6
        flex flex-col justify-between
        hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5
        transition-all duration-200
        ${className}
      `}
    >
      {/* Top Header & Price */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-zinc-100 leading-snug">
                {pkg.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                <Clock size={12} className="text-amber-400/80" />
                <span>Validade: {pkg.validity_days} dias</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {pkg.description && (
          <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
            {pkg.description}
          </p>
        )}

        {/* Price display */}
        <div className="mb-6 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider font-medium text-zinc-400">
            Preço do Pacote
          </span>
          <span className="text-2xl font-bold text-amber-400">
            {formatCurrencyBRL(pkg.price)}
          </span>
        </div>

        {/* Included Services List */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Sparkles size={13} className="text-amber-400" />
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
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <CheckCircle2
                      size={15}
                      className="text-amber-400 shrink-0"
                    />
                    <span className="font-medium text-amber-300/90">
                      {item.quantity}x
                    </span>
                    <span className="text-zinc-200">{serviceName}</span>
                  </li>
                );
              })
            ) : (
              <li className="text-xs text-zinc-500 italic">
                Nenhum serviço discriminado
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-zinc-800/80">
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
