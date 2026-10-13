import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  History,
  CalendarCheck2,
  CalendarX,
  Loader2,
  Plus,
} from 'lucide-react';
import { AppointmentResponse, AppointmentStatus } from '../../types/api';
import { AppointmentCard } from './AppointmentCard';
import { CancelModal } from './CancelModal';
import { Button } from '../common/Button';

export interface AppointmentListProps {
  appointments: AppointmentResponse[];
  servicesMap?: Record<number, string>;
  professionalsMap?: Record<number, string>;
  isLoading?: boolean;
  cancellationWindowHours?: number;
  onCancelSuccess?: (cancelledAppointment: AppointmentResponse) => void;
  onBookNewClick?: () => void;
  className?: string;
}

export type AppointmentTab = 'upcoming' | 'past';

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments = [],
  servicesMap = {},
  professionalsMap = {},
  isLoading = false,
  cancellationWindowHours = 2,
  onCancelSuccess,
  onBookNewClick,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<AppointmentResponse | null>(null);

  // Split appointments into Upcoming and Past/Cancelled lists
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = Date.now();
    const upcoming: AppointmentResponse[] = [];
    const past: AppointmentResponse[] = [];

    appointments.forEach((appt) => {
      const startTimeMs = new Date(appt.start_time).getTime();
      const isActiveStatus =
        appt.status === AppointmentStatus.BOOKED ||
        appt.status === AppointmentStatus.CONFIRMED;

      if (isActiveStatus && startTimeMs > now) {
        upcoming.push(appt);
      } else {
        past.push(appt);
      }
    });

    // Upcoming: earliest first (ascending)
    upcoming.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Past: latest first (descending)
    past.sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    return {
      upcomingAppointments: upcoming,
      pastAppointments: past,
    };
  }, [appointments]);

  const handleCancelClick = (appointment: AppointmentResponse) => {
    setAppointmentToCancel(appointment);
  };

  const handleModalClose = () => {
    setAppointmentToCancel(null);
  };

  const handleModalCancelled = (updatedAppointment: AppointmentResponse) => {
    onCancelSuccess?.(updatedAppointment);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink pb-3 gap-2">
        <div className="flex items-center gap-2">
          {/* Upcoming Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-sm font-sign uppercase tracking-wider text-xs sm:text-sm font-medium transition-all select-none
              ${
                activeTab === 'upcoming'
                  ? 'bg-ink text-card shadow-stamp-sm'
                  : 'bg-paper-dark text-ink-soft hover:text-ink border border-ink-line'
              }
            `}
          >
            <CalendarCheck2 size={16} />
            <span>Próximos</span>
            <span
              className={`
                px-1.5 py-0.5 rounded-sm text-[10px] font-bold font-sign
                ${
                  activeTab === 'upcoming'
                    ? 'bg-card text-ink'
                    : 'bg-card text-ink-muted'
                }
              `}
            >
              {upcomingAppointments.length}
            </span>
          </button>

          {/* Past Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-sm font-sign uppercase tracking-wider text-xs sm:text-sm font-medium transition-all select-none
              ${
                activeTab === 'past'
                  ? 'bg-ink text-card shadow-stamp-sm'
                  : 'bg-paper-dark text-ink-soft hover:text-ink border border-ink-line'
              }
            `}
          >
            <History size={16} />
            <span>Histórico</span>
            <span
              className={`
                px-1.5 py-0.5 rounded-sm text-[10px] font-bold font-sign
                ${
                  activeTab === 'past'
                    ? 'bg-card text-ink'
                    : 'bg-card text-ink-muted'
                }
              `}
            >
              {pastAppointments.length}
            </span>
          </button>
        </div>

        {/* Action shortcut to book a new appointment */}
        {onBookNewClick && (
          <Button
            variant="primary"
            size="sm"
            onClick={onBookNewClick}
            leftIcon={<Plus size={14} />}
            className="hidden sm:inline-flex"
          >
            Novo Agendamento
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-ink-soft">
          <Loader2 size={28} className="animate-spin text-pole-red" />
          <p className="font-sign uppercase tracking-wider text-sm">Carregando seus agendamentos...</p>
        </div>
      ) : activeTab === 'upcoming' ? (
        /* Upcoming Tab Content */
        upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAppointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                servicesMap={servicesMap}
                professionalsMap={professionalsMap}
                cancellationWindowHours={cancellationWindowHours}
                onCancelClick={handleCancelClick}
              />
            ))}
          </div>
        ) : (
          /* Empty State for Upcoming */
          <div className="card-paper p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-stamp-sm">
            <div className="w-14 h-14 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink shadow-stamp-sm">
              <CalendarClock size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-lg text-ink">
                Você não possui agendamentos futuros
              </h3>
              <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-1 max-w-sm">
                Reserve um horário com nossos profissionais para garantir seu
                atendimento.
              </p>
            </div>
            {onBookNewClick && (
              <Button
                variant="primary"
                size="md"
                onClick={onBookNewClick}
                leftIcon={<Plus size={16} />}
              >
                Agendar Horário
              </Button>
            )}
          </div>
        )
      ) : (
        /* Past / Cancelled Tab Content */
        pastAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastAppointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                servicesMap={servicesMap}
                professionalsMap={professionalsMap}
                cancellationWindowHours={cancellationWindowHours}
                onCancelClick={handleCancelClick}
              />
            ))}
          </div>
        ) : (
          /* Empty State for Past */
          <div className="card-paper p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-stamp-sm">
            <div className="w-14 h-14 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink-muted">
              <CalendarX size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-lg text-ink">
                Nenhum histórico disponível
              </h3>
              <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-1 max-w-sm">
                Seus atendimentos anteriores ou cancelados serão listados aqui.
              </p>
            </div>
          </div>
        )
      )}

      {/* Cancellation Confirmation Modal */}
      <CancelModal
        isOpen={Boolean(appointmentToCancel)}
        appointment={appointmentToCancel}
        servicesMap={servicesMap}
        professionalsMap={professionalsMap}
        cancellationWindowHours={cancellationWindowHours}
        onClose={handleModalClose}
        onCancelled={handleModalCancelled}
      />
    </div>
  );
};

export default AppointmentList;
