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
        card-clean p-6 hover:border-slate-300 hover:shadow-sm
        flex flex-col justify-between transition-all duration-150
        ${className}
      `}
    >
      {/* Top Header & Price */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Package size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 leading-snug">
                {pkg.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                <Clock size={12} className="text-slate-400" />
                <span>Validade: {pkg.validity_days} dias</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {pkg.description && (
          <p className="text-xs sm:text-sm text-slate-500 mb-4 line-clamp-2">
            {pkg.description}
          </p>
        )}

        {/* Price display */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Preço do Pacote
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyBRL(pkg.price)}
          </span>
        </div>

        {/* Included Services List */}
        <div className="space-y-2 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sessões Inclusas
          </div>

          <ul className="space-y-2">
            {pkg.items && pkg.items.length > 0 ? (
              pkg.items.map((item) => {
                const serviceName =
                  servicesMap[item.service_id] ?? `Serviço #${item.service_id}`;
                return (
                  <li
                    key={item.id || item.service_id}
                    className="flex items-center gap-2 text-sm text-slate-800 pb-1.5 border-b border-slate-100"
                  >
                    <CheckCircle2
                      size={15}
                      className="text-emerald-600 shrink-0"
                    />
                    <span className="font-bold text-slate-900">
                      {item.quantity}x
                    </span>
                    <span className="text-slate-700 font-medium">{serviceName}</span>
                  </li>
                );
              })
            ) : (
              <li className="text-xs text-slate-400 italic">
                Nenhum serviço discriminado
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-100">
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
