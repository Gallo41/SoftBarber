import React from 'react';
import { LucideIcon, CalendarPlus, Package, Wallet, CalendarCheck2 } from 'lucide-react';

export type ClientNavTab = 'booking' | 'packages' | 'wallet' | 'appointments';

export interface BottomNavProps {
  activeTab: ClientNavTab;
  onTabChange: (tab: ClientNavTab) => void;
  activeCreditsCount?: number;
  upcomingCount?: number;
  className?: string;
}

interface NavItem {
  id: ClientNavTab;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeCreditsCount = 0,
  upcomingCount = 0,
  className = '',
}) => {
  const navItems: NavItem[] = [
    {
      id: 'booking',
      label: 'Agendar',
      icon: CalendarPlus,
    },
    {
      id: 'packages',
      label: 'Pacotes',
      icon: Package,
    },
    {
      id: 'wallet',
      label: 'Carteira',
      icon: Wallet,
      badgeCount: activeCreditsCount > 0 ? activeCreditsCount : undefined,
    },
    {
      id: 'appointments',
      label: 'Meus Horários',
      icon: CalendarCheck2,
      badgeCount: upcomingCount > 0 ? upcomingCount : undefined,
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#FAFAF9]/90 backdrop-blur-md border-t border-slate-200/80 md:hidden safe-area-bottom shadow-lg ${className}`}
      aria-label="Navegação móvel do cliente"
    >
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`
                relative flex flex-col items-center justify-center py-1 transition-all select-none
                ${
                  isActive
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className="transition-transform duration-150"
                />

                {/* Badge counter if present */}
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
                    aria-label={`${item.badgeCount} pendentes`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </div>

              <span className="text-[11px] mt-1 tracking-tight leading-none">
                {item.label}
              </span>

              {/* Active bar pill indicator */}
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-slate-900" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
