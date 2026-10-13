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
      className={`fixed bottom-0 left-0 right-0 z-40 bg-card border-t-[1.5px] border-ink md:hidden safe-area-bottom shadow-lg ${className}`}
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
                relative flex flex-col items-center justify-center py-1 transition-colors select-none font-sign uppercase tracking-wider
                ${
                  isActive
                    ? 'text-pole-red font-semibold'
                    : 'text-ink-muted hover:text-ink'
                }
              `}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.75}
                  className={`transition-transform duration-150 ${
                    isActive ? 'scale-105 text-pole-red' : 'text-ink-soft'
                  }`}
                />

                {/* Badge indicator */}
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-sm bg-pole-red text-card text-[10px] font-sign font-bold flex items-center justify-center leading-none border border-ink">
                    {item.badgeCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-1 leading-none">
                {item.label}
              </span>

              {/* Active Tab Indicator Bar */}
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-pole-red" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
