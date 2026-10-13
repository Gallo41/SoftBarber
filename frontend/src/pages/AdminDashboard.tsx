import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  CalendarCheck2,
  Percent,
  Wallet,
  DollarSign,
  Check,
  X,
} from 'lucide-react';
import {
  Professional,
  AppointmentStatus,
  PaymentType,
} from '../types/api';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { formatCurrencyBRL } from '../components/booking/ServiceCard';
import { toLocalDateString } from '../components/booking/SlotPicker';

export interface AdminAppointment {
  id: number;
  professional_id: number;
  customer_name: string;
  customer_phone?: string;
  service_id: number;
  service_name: string;
  service_duration: number;
  service_price: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: AppointmentStatus;
  payment_type: PaymentType;
}

const DEFAULT_PROFESSIONALS: Professional[] = [
  {
    id: 1,
    name: 'Carlos Silva',
    phone: '(11) 98765-4321',
    is_active: true,
  },
  {
    id: 2,
    name: 'Marcos Rossi',
    phone: '(11) 91234-5678',
    is_active: true,
  },
];

export const AdminDashboard: React.FC = () => {
  const todayStr = useMemo(() => toLocalDateString(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDateString(d);
  }, []);

  // Filter States
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Appointments master state for the barbershop
  const [appointmentsList, setAppointmentsList] = useState<AdminAppointment[]>([
    {
      id: 1,
      professional_id: 1,
      customer_name: 'Lucas Oliveira',
      customer_phone: '(11) 99887-1122',
      service_id: 1,
      service_name: 'Corte Tradicional Masculino',
      service_duration: 30,
      service_price: 45.0,
      date: todayStr,
      start_time: '09:00',
      end_time: '09:30',
      status: AppointmentStatus.COMPLETED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
    {
      id: 2,
      professional_id: 1,
      customer_name: 'Gabriel Santos',
      customer_phone: '(11) 98776-3344',
      service_id: 2,
      service_name: 'Barba Terapia Completa',
      service_duration: 30,
      service_price: 35.0,
      date: todayStr,
      start_time: '10:00',
      end_time: '10:30',
      status: AppointmentStatus.CONFIRMED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
    {
      id: 3,
      professional_id: 1,
      customer_name: 'Felipe Rocha',
      customer_phone: '(11) 97665-5566',
      service_id: 3,
      service_name: 'Combo Cabelo + Barba',
      service_duration: 60,
      service_price: 70.0,
      date: todayStr,
      start_time: '11:00',
      end_time: '12:00',
      status: AppointmentStatus.BOOKED,
      payment_type: PaymentType.AVULSO_LOCAL,
    },
    {
      id: 4,
      professional_id: 1,
      customer_name: 'Mateus Castro',
      customer_phone: '(11) 96554-7788',
      service_id: 1,
      service_name: 'Corte Tradicional Masculino',
      service_duration: 30,
      service_price: 45.0,
      date: todayStr,
      start_time: '14:30',
      end_time: '15:00',
      status: AppointmentStatus.BOOKED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
    {
      id: 5,
      professional_id: 1,
      customer_name: 'Bruno Alves',
      customer_phone: '(11) 95443-9900',
      service_id: 4,
      service_name: 'Acabamento & Pezinho',
      service_duration: 15,
      service_price: 20.0,
      date: todayStr,
      start_time: '16:00',
      end_time: '16:15',
      status: AppointmentStatus.CANCELLED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
    {
      id: 6,
      professional_id: 2,
      customer_name: 'Rodrigo Lima',
      customer_phone: '(11) 94332-1122',
      service_id: 1,
      service_name: 'Corte Tradicional Masculino',
      service_duration: 30,
      service_price: 45.0,
      date: todayStr,
      start_time: '10:30',
      end_time: '11:00',
      status: AppointmentStatus.BOOKED,
      payment_type: PaymentType.AVULSO_LOCAL,
    },
  ]);

  // Filtered appointments for the chosen professional and date
  const filteredAppointments = useMemo(() => {
    return appointmentsList
      .filter(
        (a) =>
          a.professional_id === selectedProfessionalId &&
          a.date === selectedDate
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [appointmentsList, selectedProfessionalId, selectedDate]);

  // Computed KPI Metrics for the selected date & professional
  const dailyMetrics = useMemo(() => {
    const totalAppointments = filteredAppointments.filter(
      (a) => a.status !== AppointmentStatus.CANCELLED
    ).length;

    const completedCount = filteredAppointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED
    ).length;

    const creditUsedCount = filteredAppointments.filter(
      (a) =>
        a.payment_type === PaymentType.PACKAGE_CREDIT &&
        a.status !== AppointmentStatus.CANCELLED
    ).length;

    const estimatedTotalRevenue = filteredAppointments
      .filter((a) => a.status !== AppointmentStatus.CANCELLED)
      .reduce((sum, a) => sum + a.service_price, 0);

    // Theoretical maximum capacity: 8 hours * 2 appointments per hour = 16 slots
    const capacitySlots = 16;
    const occupancyRate = Math.min(
      100,
      Math.round((totalAppointments / capacitySlots) * 100)
    );

    return {
      totalAppointments,
      completedCount,
      creditUsedCount,
      occupancyRate,
      estimatedTotalRevenue,
    };
  }, [filteredAppointments]);

  // Status transition handler
  const handleUpdateStatus = (
    appointmentId: number,
    newStatus: AppointmentStatus
  ) => {
    setAppointmentsList((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    );
  };

  const selectedProfObj =
    DEFAULT_PROFESSIONALS.find((p) => p.id === selectedProfessionalId) ||
    DEFAULT_PROFESSIONALS[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-mobile-nav md:pb-16 space-y-8 animate-in fade-in duration-150">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-2">
            <Scissors size={13} strokeWidth={2} />
            <span>Gestão do Salão & Agenda</span>
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Painel da Barbearia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Controle de horários do dia, conferência de créditos e status de atendimento.
          </p>
        </div>

        {/* Filters: Professional & Date Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Professional Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 select-none">
            <span className="text-xs font-semibold text-slate-500 pl-2 pr-1 hidden sm:inline">
              Profissional:
            </span>
            {DEFAULT_PROFESSIONALS.map((prof) => {
              const isSelected = selectedProfessionalId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSelectedProfessionalId(prof.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none
                    ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  {prof.name}
                </button>
              );
            })}
          </div>

          {/* Date Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 select-none">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none
                ${
                  selectedDate === todayStr
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none
                ${
                  selectedDate === tomorrowStr
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              Amanhã
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900 ml-1"
            />
          </div>
        </div>
      </div>

      {/* 2. Daily Metrics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Agendamentos */}
        <div className="p-5 card-clean">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Agendamentos do Dia
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <CalendarCheck2 size={16} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
            {dailyMetrics.totalAppointments}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {selectedProfObj.name} em {selectedDate}
          </span>
        </div>

        {/* Card 2: Créditos Utilizados */}
        <div className="p-5 card-clean">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Créditos Utilizados
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-blue-600">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
            {dailyMetrics.creditUsedCount}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Debitado de pacotes ativos
          </span>
        </div>

        {/* Card 3: Taxa de Ocupação */}
        <div className="p-5 card-clean">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Taxa de Ocupação
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Percent size={16} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
            {dailyMetrics.occupancyRate}%
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${dailyMetrics.occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Card 4: Faturamento Estimado */}
        <div className="p-5 card-clean">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Valor da Grade
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyBRL(dailyMetrics.estimatedTotalRevenue)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Soma dos atendimentos
          </span>
        </div>
      </div>

      {/* 3. Daily Schedule Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            <h2 className="font-bold text-lg text-slate-900 tracking-tight">
              Linha do Tempo da Agenda ({filteredAppointments.length} agendamentos)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {selectedProfObj.name} • {selectedDate}
          </span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-12 card-clean text-center flex flex-col items-center justify-center space-y-3">
            <Calendar size={36} className="text-slate-300" strokeWidth={1.5} />
            <h3 className="font-semibold text-base text-slate-900">
              Nenhum agendamento para esta data
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Não existem horários reservados para {selectedProfObj.name} no dia {selectedDate}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appt) => {
              const isPastOrCompleted =
                appt.status === AppointmentStatus.COMPLETED ||
                appt.status === AppointmentStatus.CANCELLED;

              return (
                <div
                  key={appt.id}
                  className={`
                    p-4 sm:p-5 card-clean transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4
                    ${
                      appt.status === AppointmentStatus.COMPLETED
                        ? 'bg-slate-50/70 border-slate-200/50 opacity-80'
                        : appt.status === AppointmentStatus.CANCELLED
                        ? 'bg-rose-50/40 border-rose-200/50 opacity-70'
                        : 'hover:border-slate-300 hover:shadow-sm'
                    }
                  `}
                >
                  {/* Left: Time and Client Info */}
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Time Slot Box */}
                    <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-center shrink-0">
                      <span className="text-base font-bold text-slate-900 block leading-tight tabular-nums">
                        {appt.start_time}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {appt.end_time}
                      </span>
                    </div>

                    {/* Customer & Service Details */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-slate-900">
                          {appt.customer_name}
                        </span>
                        {appt.customer_phone && (
                          <span className="text-xs text-slate-400">
                            ({appt.customer_phone})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-medium text-slate-800">
                          {appt.service_name}
                        </span>
                        <span>•</span>
                        <span>{appt.service_duration} min</span>
                        <span>•</span>
                        <span className="text-xs font-bold text-slate-900 tabular-nums">
                          {formatCurrencyBRL(appt.service_price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Management Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      {/* Payment Type Badge */}
                      {appt.payment_type === PaymentType.PACKAGE_CREDIT ? (
                        <Badge variant="brand" size="sm">
                          Crédito Pacote
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Avulso no Local
                        </Badge>
                      )}

                      {/* Status Badge */}
                      <Badge status={appt.status} size="sm" />
                    </div>

                    {/* Action Buttons */}
                    {!isPastOrCompleted && (
                      <div className="flex items-center gap-1.5">
                        {appt.status === AppointmentStatus.BOOKED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleUpdateStatus(appt.id, AppointmentStatus.CONFIRMED)
                            }
                            leftIcon={<Check size={14} />}
                            title="Confirmar presença"
                          >
                            Confirmar
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            handleUpdateStatus(appt.id, AppointmentStatus.COMPLETED)
                          }
                          leftIcon={<CheckCircle2 size={14} />}
                          title="Marcar como atendido / concluído"
                        >
                          Concluir
                        </Button>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(appt.id, AppointmentStatus.CANCELLED)
                          }
                          title="Cancelar agendamento"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Help & Policies Card */}
      <div className="p-5 card-clean bg-slate-50/70 border-slate-200/70 flex items-start gap-3.5 text-xs text-slate-600">
        <User size={18} className="text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">
            Regra de Estorno e Auditoria de Créditos:
          </span>{' '}
          Quando um cliente cancela com mais de 2 horas de antecedência, o sistema estorna
          automaticamente o crédito para o pacote correspondente e registra uma transação
          `REFUND_CANCELLATION` no Credit Ledger. Cancelamentos tardios (menos de 2h) não estornam o crédito.
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
