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
      {/* Tab Switcher & New Booking Action */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 select-none">
          {/* Upcoming Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none
              ${
                activeTab === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <CalendarCheck2 size={14} />
            <span>Próximos</span>
            <span
              className={`
                px-1.5 py-0.2 rounded-full text-[10px] font-bold
                ${
                  activeTab === 'upcoming'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
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
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none
              ${
                activeTab === 'past'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <History size={14} />
            <span>Histórico</span>
            <span
              className={`
                px-1.5 py-0.2 rounded-full text-[10px] font-bold
                ${
                  activeTab === 'past'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
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
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-slate-700" />
          <p className="text-xs font-medium">Carregando seus agendamentos...</p>
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
          <div className="card-clean p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
              <CalendarClock size={26} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900">
                Você não possui agendamentos futuros
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Reserve um horário com nossos profissionais para garantir seu atendimento.
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
          <div className="card-clean p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <CalendarX size={26} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900">
                Nenhum histórico disponível
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
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
