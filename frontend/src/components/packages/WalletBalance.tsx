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
          card-paper p-8 text-center flex flex-col items-center justify-center shadow-stamp-sm
          ${className}
        `}
      >
        <div className="w-14 h-14 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink mb-4 shadow-stamp-sm">
          <PackageOpen size={28} strokeWidth={1.75} />
        </div>
        <h3 className="font-display text-lg text-ink mb-2">
          Sua Carteira de Créditos está vazia
        </h3>
        <p className="font-sign uppercase tracking-wider text-xs text-ink-soft max-w-md mb-6">
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
            className="card-paper p-5 shadow-stamp-sm hover:shadow-stamp transition-all duration-150"
          >
            {/* Header: Package Name, ID & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink shrink-0 shadow-stamp-sm">
                  <Wallet size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="font-display text-lg text-ink leading-tight">
                    {packageName}
                  </h4>
                  <div className="flex items-center gap-2 font-sign uppercase tracking-wider text-xs text-ink-muted mt-0.5">
                    <span>Cód. #{pkg.id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-pole-red" />
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
              <div className="mb-4 px-3 py-2 rounded-sm bg-mustard-tint border-[1.5px] border-mustard flex items-center gap-2 font-sign uppercase tracking-wider text-xs text-mustard">
                <AlertTriangle size={14} className="shrink-0 text-mustard" />
                <span>
                  Atenção: seus créditos expiram em {expiry.diffDays}{' '}
                  {expiry.diffDays === 1 ? 'dia' : 'dias'}. Aproveite para agendar!
                </span>
              </div>
            )}

            {/* Service Balances List & Punch-Card Bars */}
            <div className="space-y-3 pt-2">
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
                      className="p-3.5 rounded-sm bg-paper-dark border-[1.5px] border-ink shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-dashed border-ink-line">
                        <span className="font-semibold text-sm text-ink">
                          {serviceName}
                        </span>
                        <span className="font-sign uppercase tracking-wider text-xs font-bold text-pole-red">
                          {balance.remaining_quantity} de {balance.total_quantity}{' '}
                          restantes
                        </span>
                      </div>

                      {/* Progress Bar (Punch-card strip style) */}
                      <div className="w-full bg-paper-deep border border-ink h-2.5 overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all duration-300 ${
                            balance.remaining_quantity > 0
                              ? 'bg-pole-red'
                              : 'bg-ink-muted'
                          }`}
                          style={{ width: `${Math.min(100, percentRemaining)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between font-sign uppercase tracking-wider text-xs text-ink-muted">
                        <span>{percentRemaining}% disponível</span>

                        {canUse && (
                          <button
                            type="button"
                            onClick={() =>
                              onUseCreditClick?.(pkg.id, balance.service_id)
                            }
                            className="text-pole-red hover:text-pole-red-dark font-sign uppercase tracking-wider font-semibold inline-flex items-center gap-1 transition-colors"
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
                <p className="text-xs text-ink-muted italic">
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
