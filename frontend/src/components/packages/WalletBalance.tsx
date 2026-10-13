import React from 'react';
import {
  Wallet,
  Calendar,
  AlertTriangle,
  PackageOpen,
  ArrowRight,
} from 'lucide-react';
import { CustomerPackageResponse, PackageStatus } from '../../types/api';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export interface WalletBalanceProps {
  packages: CustomerPackageResponse[];
  servicesMap?: Record<number, string>;
  packagesMap?: Record<number, string>;
  onBuyPackageClick?: () => void;
  onUseCreditClick?: (customerPackageId: number, serviceId: number) => void;
  className?: string;
}

/**
 * Calculates human-readable expiry information.
 */
function getExpiryInfo(expiresAtStr: string) {
  const expiryDate = new Date(expiresAtStr);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(expiryDate);

  const isExpired = diffDays < 0;
  const isExpiringSoon = !isExpired && diffDays <= 7;

  let text = `Expira em ${diffDays} dias (${formattedDate})`;
  if (isExpired) {
    text = `Expirou em ${formattedDate}`;
  } else if (diffDays === 0) {
    text = `Expira hoje (${formattedDate})`;
  } else if (diffDays === 1) {
    text = `Expira amanhã (${formattedDate})`;
  }

  return {
    formattedDate,
    diffDays,
    isExpired,
    isExpiringSoon,
    text,
  };
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({
  packages,
  servicesMap = {},
  packagesMap = {},
  onBuyPackageClick,
  onUseCreditClick,
  className = '',
}) => {
  // Empty State
  if (!packages || packages.length === 0) {
    return (
      <div
        className={`
          card-clean p-8 text-center flex flex-col items-center justify-center
          ${className}
        `}
      >
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <PackageOpen size={28} strokeWidth={1.5} />
        </div>
        <h3 className="font-semibold text-lg text-slate-900 mb-2">
          Sua Carteira de Créditos está vazia
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Você ainda não comprou nenhum pacote. Adquira pacotes com desconto e use
          seus créditos para agendar cortes a qualquer momento!
        </p>
        {onBuyPackageClick && (
          <Button variant="primary" size="md" onClick={onBuyPackageClick}>
            Explorar Pacotes Disponíveis
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {packages.map((pkg) => {
        const expiry = getExpiryInfo(pkg.expires_at);
        const isActive = pkg.status === PackageStatus.ACTIVE && !expiry.isExpired;
        const packageName =
          packagesMap[pkg.package_id] ?? `Pacote #${pkg.package_id}`;

        return (
          <div
            key={pkg.id}
            className="card-clean p-6 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            {/* Package Card Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Wallet size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-base sm:text-lg text-slate-900 leading-snug">
                    {packageName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                    <span>Cód. #{pkg.id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      {expiry.text}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge status={pkg.status} />
              </div>
            </div>

            {/* Expiring Soon Warning Banner */}
            {isActive && expiry.isExpiringSoon && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center gap-2 text-xs text-amber-800 font-medium">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <span>
                  Atenção: seus créditos expiram em {expiry.diffDays}{' '}
                  {expiry.diffDays === 1 ? 'dia' : 'dias'}. Aproveite para agendar!
                </span>
              </div>
            )}

            {/* Service Balances List */}
            <div className="space-y-3 pt-1">
              {pkg.balances && pkg.balances.length > 0 ? (
                pkg.balances.map((balance) => {
                  const serviceName =
                    servicesMap[balance.service_id] ??
                    `Serviço #${balance.service_id}`;
                  const percentRemaining =
                    balance.total_quantity > 0
                      ? Math.round(
                          (balance.remaining_quantity / balance.total_quantity) *
                            100
                        )
                      : 0;

                  const canUse =
                    isActive &&
                    balance.remaining_quantity > 0 &&
                    Boolean(onUseCreditClick);

                  return (
                    <div
                      key={balance.id || balance.service_id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/70"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-200/60">
                        <span className="font-semibold text-sm text-slate-900">
                          {serviceName}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {balance.remaining_quantity} de {balance.total_quantity}{' '}
                          restantes
                        </span>
                      </div>

                      {/* Slim Modern Progress Bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            balance.remaining_quantity > 0
                              ? 'bg-slate-900'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, percentRemaining)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{percentRemaining}% disponível</span>

                        {canUse && (
                          <button
                            type="button"
                            onClick={() =>
                              onUseCreditClick?.(pkg.id, balance.service_id)
                            }
                            className="text-blue-600 hover:text-blue-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Agendar com crédito</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum saldo computado para este pacote.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WalletBalance;
