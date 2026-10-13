import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { AvailableSlot } from '../../types/api';
import { getAvailableSlots } from '../../api/schedule';
import { Button } from '../common/Button';

export interface DayOption {
  dateString: string;
  dayOfWeek: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

/**
 * Formats a Date object to YYYY-MM-DD in local time.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO datetime string or time string into HH:mm.
 */
export function formatSlotTime(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    return timePart.substring(0, 5);
  }
  if (timeStr.includes(':')) {
    return timeStr.substring(0, 5);
  }
  return timeStr;
}

/**
 * Generates an array of 7 consecutive days starting from a given date.
 */
export function generateNext7Days(baseDate?: Date): DayOption[] {
  const start = baseDate ? new Date(baseDate) : new Date();
  const days: DayOption[] = [];
  const todayStr = toLocalDateString(new Date());

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = toLocalDateString(current);

    const rawDayOfWeek = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(current);
    const dayOfWeekClean = rawDayOfWeek.replace('.', '');
    const dayOfWeek = dayOfWeekClean.charAt(0).toUpperCase() + dayOfWeekClean.slice(1);

    const rawMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(current);
    const monthClean = rawMonth.replace('.', '');
    const monthName = monthClean.charAt(0).toUpperCase() + monthClean.slice(1);

    days.push({
      dateString: dateStr,
      dayOfWeek,
      dayNumber: current.getDate(),
      monthName,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export interface SlotPickerProps {
  professionalId: number;
  serviceId: number;
  selectedDate?: string;
  selectedSlot?: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot, date: string) => void;
  onDateChange?: (date: string) => void;
  className?: string;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  professionalId,
  serviceId,
  selectedDate,
  selectedSlot,
  onSelectSlot,
  onDateChange,
  className = '',
}) => {
  const next7Days = useMemo(() => generateNext7Days(), []);
  const initialDate = selectedDate || next7Days[0]?.dateString || toLocalDateString(new Date());

  const [activeDate, setActiveDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  // Sync internal activeDate with selectedDate prop if provided
  useEffect(() => {
    if (selectedDate && selectedDate !== activeDate) {
      setActiveDate(selectedDate);
    }
  }, [selectedDate]);

  const handleDateClick = (dateStr: string) => {
    setActiveDate(dateStr);
    onDateChange?.(dateStr);
  };

  const handleRefresh = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  // Fetch slots whenever professional, service, activeDate or refresh changes
  const fetchSlots = useCallback(async () => {
    if (!professionalId || !serviceId || !activeDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getAvailableSlots(professionalId, serviceId, activeDate);
      setSlots(response.slots || []);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setError('Não foi possível carregar os horários para esta data.');
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, serviceId, activeDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots, refreshIndex]);

  // Check if a slot is selected
  const isSlotActive = (slot: AvailableSlot) => {
    if (!selectedSlot) return false;
    return selectedSlot.start_time === slot.start_time;
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Date Selector (7 Days Horizontal Scroller) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="sign-label flex items-center gap-1.5 text-ink">
            <CalendarIcon size={14} className="text-pole-red" />
            <span>Selecione a Data</span>
          </div>
          <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted">Próximos 7 dias</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {next7Days.map((day) => {
            const isSelected = day.dateString === activeDate;

            return (
              <button
                key={day.dateString}
                type="button"
                onClick={() => handleDateClick(day.dateString)}
                className={`
                  flex flex-col items-center justify-center py-2 px-1 rounded-sm
                  transition-all duration-150 select-none text-center
                  border-[1.5px]
                  ${
                    isSelected
                      ? 'bg-ink text-card border-ink shadow-stamp-sm font-bold'
                      : 'bg-card text-ink border-ink hover:bg-paper-dark'
                  }
                `}
              >
                <span
                  className={`font-sign uppercase tracking-wider text-[10px] ${
                    isSelected ? 'text-card' : 'text-ink-muted'
                  }`}
                >
                  {day.isToday ? 'Hoje' : day.dayOfWeek}
                </span>
                <span className="font-display text-base sm:text-xl mt-0.5 leading-none">
                  {day.dayNumber}
                </span>
                <span
                  className={`font-sign uppercase text-[9px] mt-0.5 ${
                    isSelected ? 'text-card' : 'text-ink-soft'
                  }`}
                >
                  {day.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Slots Header & Refresh */}
      <div className="flex items-center justify-between pt-1">
        <div className="sign-label flex items-center gap-1.5 text-ink">
          <Clock size={14} className="text-pole-red" />
          <span>Horários Disponíveis</span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Atualizar horários"
          className="font-sign uppercase tracking-wider text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* 3. Slot Grid / Loading / Empty / Error States */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-sm bg-paper-dark border border-ink-line animate-pulse flex items-center justify-center"
              >
                <div className="h-4 w-12 bg-paper-deep rounded-sm" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-sm bg-pole-red-tint border-[1.5px] border-pole-red text-center flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} className="text-pole-red" />
            <p className="text-xs text-pole-red font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-1">
              Tentar Novamente
            </Button>
          </div>
        ) : slots.length === 0 ? (
          <div className="p-8 rounded-sm card-paper text-center flex flex-col items-center justify-center shadow-stamp-sm">
            <Clock size={28} className="text-ink-muted mb-2" strokeWidth={1.75} />
            <p className="font-display text-base text-ink">
              Nenhum horário disponível para esta data.
            </p>
            <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-1 max-w-xs">
              Todos os horários estão preenchidos ou o profissional não atende neste dia.
              Tente selecionar outra data acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((slot) => {
              const active = isSlotActive(slot);
              const formattedTime = formatSlotTime(slot.start_time);

              return (
                <button
                  key={slot.start_time}
                  type="button"
                  onClick={() => onSelectSlot(slot, activeDate)}
                  className={`
                    py-2 px-3 rounded-sm font-sign uppercase tracking-wider text-xs sm:text-sm font-semibold transition-all duration-150 select-none
                    border-[1.5px] flex items-center justify-center
                    ${
                      active
                        ? 'bg-pole-red text-card border-ink shadow-stamp-sm font-bold'
                        : 'bg-card text-ink border-ink hover:bg-paper-dark shadow-stamp-sm active:shadow-none'
                    }
                  `}
                >
                  {formattedTime}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotPicker;
