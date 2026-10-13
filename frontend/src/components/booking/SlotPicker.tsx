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
  const todayStr = useMemo(() => toLocalDateString(new Date()), []);
  const [activeDate, setActiveDate] = useState<string>(selectedDate || todayStr);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if selectedDate prop changes externally
  useEffect(() => {
    if (selectedDate && selectedDate !== activeDate) {
      setActiveDate(selectedDate);
    }
  }, [selectedDate]);

  const next7Days = useMemo(() => generateNext7Days(new Date()), []);

  const fetchSlots = useCallback(
    async (targetDate: string) => {
      if (!professionalId || !serviceId) return;

      setIsLoading(true);
      setError(null);

      try {
        const fetched = await getAvailableSlots({
          professionalId,
          serviceId,
          date: targetDate,
        });
        setSlots(Array.isArray(fetched) ? fetched : fetched.slots || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ||
            'Não foi possível carregar os horários disponíveis. Tente novamente.'
        );
        setSlots([]);
      } finally {
        setIsLoading(false);
      }
    },
    [professionalId, serviceId]
  );

  useEffect(() => {
    fetchSlots(activeDate);
  }, [fetchSlots, activeDate]);

  const handleDateClick = (dateStr: string) => {
    setActiveDate(dateStr);
    if (onDateChange) {
      onDateChange(dateStr);
    }
  };

  const handleRefresh = () => {
    fetchSlots(activeDate);
  };

  const isSlotActive = (slot: AvailableSlot) => {
    if (!selectedSlot) return false;
    return (
      selectedSlot.start_time === slot.start_time &&
      selectedSlot.end_time === slot.end_time
    );
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Date Selector: 7-day horizontal pills */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CalendarIcon size={14} className="text-slate-500" />
            <span>Selecione a Data</span>
          </div>
          <span className="text-xs text-slate-400">Próximos 7 dias</span>
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
                  flex flex-col items-center justify-center py-2.5 px-1 rounded-xl
                  transition-all duration-150 select-none text-center
                  ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm font-bold'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                  }
                `}
              >
                <span
                  className={`text-[10px] font-medium tracking-tight uppercase ${
                    isSelected ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {day.isToday ? 'Hoje' : day.dayOfWeek}
                </span>
                <span className="text-base sm:text-lg font-bold mt-0.5 leading-none">
                  {day.dayNumber}
                </span>
                <span
                  className={`text-[9px] mt-0.5 ${
                    isSelected ? 'text-slate-300' : 'text-slate-400'
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
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Clock size={14} className="text-slate-500" />
          <span>Horários Disponíveis</span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Atualizar horários"
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 font-medium"
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
                className="h-10 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center"
              >
                <div className="h-4 w-12 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} className="text-rose-500" />
            <p className="text-xs text-rose-700 font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-1">
              Tentar Novamente
            </Button>
          </div>
        ) : slots.length === 0 ? (
          <div className="p-8 rounded-2xl card-clean text-center flex flex-col items-center justify-center">
            <Clock size={28} className="text-slate-300 mb-2" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-slate-800">
              Nenhum horário disponível para esta data.
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
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
                    py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none
                    flex items-center justify-center tabular-nums
                    ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs font-bold ring-1 ring-slate-900'
                        : 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
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
