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
      className={`fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 md:hidden safe-area-bottom shadow-2xl ${className}`}
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
                relative flex flex-col items-center justify-center py-1 transition-colors select-none
                ${
                  isActive
                    ? 'text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }
              `}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-transform duration-150 ${
                    isActive ? 'scale-110 text-amber-400' : 'text-zinc-400'
                  }`}
                />

                {/* Badge indicator */}
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-extrabold flex items-center justify-center leading-none">
                    {item.badgeCount}
                  </span>
                )}
              </div>

              <span className="text-[11px] mt-1 leading-none tracking-tight">
                {item.label}
              </span>

              {/* Active Tab Indicator Bar */}
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
