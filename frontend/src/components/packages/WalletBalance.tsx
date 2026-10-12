import React from 'react';
import {
  Wallet,
  Calendar,
  AlertTriangle,
  PackageOpen,
  ArrowRight,
  Sparkles,
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
          bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8
          text-center flex flex-col items-center justify-center
          ${className}
        `}
      >
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-4">
          <PackageOpen size={32} className="text-amber-400/70" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">
          Sua Carteira de Créditos está vazia
        </h3>
        <p className="text-sm text-zinc-400 max-w-md mb-6">
          Você ainda não possui créditos ou pacotes ativos. Adquira um combo
          promocional para economizar e agendar seus cortes com praticidade.
        </p>
        {onBuyPackageClick && (
          <Button
            variant="primary"
            onClick={onBuyPackageClick}
            rightIcon={<ArrowRight size={16} />}
          >
            Explorar Pacotes Disponíveis
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {packages.map((pkg) => {
        const packageName =
          packagesMap[pkg.package_id] ?? `Pacote #${pkg.package_id}`;
        const expiry = getExpiryInfo(pkg.expires_at);
        const isActive = pkg.status === PackageStatus.ACTIVE;

        return (
          <div
            key={pkg.id}
            className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
          >
            {/* Header: Package Name, ID & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100 leading-tight">
                    {packageName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span>Cód. #{pkg.id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-zinc-500" />
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
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                <span>
                  Atenção: seus créditos expiram em {expiry.diffDays}{' '}
                  {expiry.diffDays === 1 ? 'dia' : 'dias'}. Aproveite para agendar!
                </span>
              </div>
            )}

            {/* Service Balances List & Progress Bars */}
            <div className="space-y-4 pt-2">
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
                      className="p-3.5 rounded-lg bg-zinc-950/50 border border-zinc-800/70"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400 shrink-0" />
                          <span className="text-sm font-medium text-zinc-200">
                            {serviceName}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-amber-400">
                          {balance.remaining_quantity} de {balance.total_quantity}{' '}
                          restantes
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            balance.remaining_quantity > 0
                              ? 'bg-amber-500'
                              : 'bg-zinc-600'
                          }`}
                          style={{ width: `${Math.min(100, percentRemaining)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{percentRemaining}% disponível</span>

                        {canUse && (
                          <button
                            type="button"
                            onClick={() =>
                              onUseCreditClick?.(pkg.id, balance.service_id)
                            }
                            className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 transition-colors"
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
                <p className="text-xs text-zinc-500 italic">
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
