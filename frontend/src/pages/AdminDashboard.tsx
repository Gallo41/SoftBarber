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
      customer_name: 'Matheus Rocha',
      customer_phone: '(11) 97654-5566',
      service_id: 3,
      service_name: 'Combo Cabelo + Barba',
      service_duration: 60,
      service_price: 70.0,
      date: todayStr,
      start_time: '11:30',
      end_time: '12:30',
      status: AppointmentStatus.CONFIRMED,
      payment_type: PaymentType.AVULSO_LOCAL,
    },
    {
      id: 4,
      professional_id: 1,
      customer_name: 'Felipe Almeida',
      customer_phone: '(11) 96543-7788',
      service_id: 1,
      service_name: 'Corte Tradicional Masculino',
      service_duration: 30,
      service_price: 45.0,
      date: todayStr,
      start_time: '14:00',
      end_time: '14:30',
      status: AppointmentStatus.BOOKED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
    {
      id: 5,
      professional_id: 1,
      customer_name: 'Rodrigo Mendes',
      customer_phone: '(11) 95432-9900',
      service_id: 1,
      service_name: 'Corte Tradicional Masculino',
      service_duration: 30,
      service_price: 45.0,
      date: todayStr,
      start_time: '16:00',
      end_time: '16:30',
      status: AppointmentStatus.BOOKED,
      payment_type: PaymentType.AVULSO_LOCAL,
    },
    {
      id: 6,
      professional_id: 2,
      customer_name: 'André Carvalho',
      customer_phone: '(11) 94321-2211',
      service_id: 2,
      service_name: 'Barba Terapia Completa',
      service_duration: 30,
      service_price: 35.0,
      date: todayStr,
      start_time: '10:30',
      end_time: '11:00',
      status: AppointmentStatus.COMPLETED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
    {
      id: 7,
      professional_id: 2,
      customer_name: 'Thiago Nogueira',
      customer_phone: '(11) 93210-4433',
      service_id: 1,
      service_name: 'Corte Tradicional Masculino',
      service_duration: 30,
      service_price: 45.0,
      date: todayStr,
      start_time: '15:00',
      end_time: '15:30',
      status: AppointmentStatus.CONFIRMED,
      payment_type: PaymentType.AVULSO_LOCAL,
    },
    {
      id: 8,
      professional_id: 1,
      customer_name: 'Eduardo Ramos',
      customer_phone: '(11) 92109-6655',
      service_id: 3,
      service_name: 'Combo Cabelo + Barba',
      service_duration: 60,
      service_price: 70.0,
      date: tomorrowStr,
      start_time: '10:00',
      end_time: '11:00',
      status: AppointmentStatus.BOOKED,
      payment_type: PaymentType.PACKAGE_CREDIT,
    },
  ]);

  // Filtered appointments for currently selected professional and date
  const filteredAppointments = useMemo(() => {
    return appointmentsList
      .filter(
        (appt) =>
          appt.professional_id === selectedProfessionalId &&
          appt.date === selectedDate
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [appointmentsList, selectedProfessionalId, selectedDate]);

  // Daily Metrics
  const dailyMetrics = useMemo(() => {
    const totalAppointments = filteredAppointments.length;
    const creditUsedCount = filteredAppointments.filter(
      (a) =>
        a.payment_type === PaymentType.PACKAGE_CREDIT &&
        a.status !== AppointmentStatus.CANCELLED
    ).length;

    // Total available daily capacity assuming ~8 slots per day
    const estimatedDailyCapacity = 8;
    const nonCancelledCount = filteredAppointments.filter(
      (a) => a.status !== AppointmentStatus.CANCELLED
    ).length;
    const occupancyRate = Math.min(
      100,
      Math.round((nonCancelledCount / estimatedDailyCapacity) * 100)
    );

    const estimatedTotalRevenue = filteredAppointments
      .filter((a) => a.status !== AppointmentStatus.CANCELLED)
      .reduce((sum, a) => sum + a.service_price, 0);

    return {
      totalAppointments,
      creditUsedCount,
      occupancyRate,
      estimatedTotalRevenue,
    };
  }, [filteredAppointments]);

  // Action handlers to update appointment statuses
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-paper-dark border-[1.5px] border-ink text-ink font-sign uppercase tracking-wider text-xs font-semibold mb-2 shadow-stamp-sm">
            <Scissors size={13} strokeWidth={1.75} />
            <span>Gestão do Salão & Agenda</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight">
            Painel da Barbearia
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 font-medium">
            Controle de horários do dia, conferência de créditos e status de atendimento.
          </p>
        </div>

        {/* Filters: Professional & Date Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Professional Selector */}
          <div className="flex items-center gap-1.5 bg-paper-dark border-[1.5px] border-ink rounded-sm p-1 shadow-sm">
            <span className="sign-label pl-2 hidden sm:inline">
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
                    px-3 py-1.5 rounded-sm font-sign uppercase tracking-wider text-xs font-semibold transition-all select-none
                    ${
                      isSelected
                        ? 'bg-ink text-card shadow-sm font-bold'
                        : 'text-ink-soft hover:text-ink hover:bg-paper'
                    }
                  `}
                >
                  {prof.name}
                </button>
              );
            })}
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-paper-dark border-[1.5px] border-ink rounded-sm p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`
                px-3 py-1.5 rounded-sm font-sign uppercase tracking-wider text-xs font-semibold transition-all select-none
                ${
                  selectedDate === todayStr
                    ? 'bg-ink text-card shadow-sm font-bold'
                    : 'text-ink-soft hover:text-ink hover:bg-paper'
                }
              `}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`
                px-3 py-1.5 rounded-sm font-sign uppercase tracking-wider text-xs font-semibold transition-all select-none
                ${
                  selectedDate === tomorrowStr
                    ? 'bg-ink text-card shadow-sm font-bold'
                    : 'text-ink-soft hover:text-ink hover:bg-paper'
                }
              `}
            >
              Amanhã
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-card border border-ink rounded-sm px-2 py-1 text-xs text-ink font-sign uppercase focus:outline-none focus:border-pole-red"
            />
          </div>
        </div>
      </div>

      {/* 2. Daily Metrics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Agendamentos */}
        <div className="p-5 card-paper shadow-stamp-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="sign-label">
              Agendamentos do Dia
            </span>
            <div className="p-1.5 rounded-sm bg-paper-dark border border-ink text-ink shadow-sm">
              <CalendarCheck2 size={15} />
            </div>
          </div>
          <div className="font-display text-3xl sm:text-4xl text-ink">
            {dailyMetrics.totalAppointments}
          </div>
          <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted mt-1 block">
            {selectedProfObj.name} em {selectedDate}
          </span>
        </div>

        {/* Card 2: Créditos Utilizados */}
        <div className="p-5 card-paper shadow-stamp-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="sign-label">
              Créditos Utilizados
            </span>
            <div className="p-1.5 rounded-sm bg-paper-dark border border-ink text-pole-red shadow-sm">
              <Wallet size={15} />
            </div>
          </div>
          <div className="font-display text-3xl sm:text-4xl text-pole-red">
            {dailyMetrics.creditUsedCount}
          </div>
          <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted mt-1 block">
            Debitado de pacotes ativos
          </span>
        </div>

        {/* Card 3: Taxa de Ocupação */}
        <div className="p-5 card-paper shadow-stamp-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="sign-label">
              Taxa de Ocupação
            </span>
            <div className="p-1.5 rounded-sm bg-moss-tint border border-moss text-moss shadow-sm">
              <Percent size={15} />
            </div>
          </div>
          <div className="font-display text-3xl sm:text-4xl text-ink">
            {dailyMetrics.occupancyRate}%
          </div>
          <div className="w-full bg-paper-deep border border-ink h-2 mt-2">
            <div
              className="bg-moss h-full"
              style={{ width: `${dailyMetrics.occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Card 4: Faturamento Estimado */}
        <div className="p-5 card-paper shadow-stamp-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="sign-label">
              Valor da Grade
            </span>
            <div className="p-1.5 rounded-sm bg-paper-dark border border-ink text-ink shadow-sm">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="font-display text-3xl sm:text-4xl text-pole-red">
            {formatCurrencyBRL(dailyMetrics.estimatedTotalRevenue)}
          </div>
          <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted mt-1 block">
            Soma dos atendimentos
          </span>
        </div>
      </div>

      {/* 3. Daily Schedule Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-pole-red" />
            <h2 className="font-display text-xl text-ink">
              Linha do Tempo da Agenda ({filteredAppointments.length} agendamentos)
            </h2>
          </div>
          <span className="font-sign uppercase tracking-wider text-xs text-ink-muted">
            {selectedProfObj.name} • {selectedDate}
          </span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="p-12 card-paper text-center flex flex-col items-center justify-center space-y-3 shadow-stamp-sm">
            <Calendar size={36} className="text-ink-muted" strokeWidth={1.75} />
            <h3 className="font-display text-lg text-ink">
              Nenhum agendamento para esta data
            </h3>
            <p className="font-sign uppercase tracking-wider text-xs text-ink-soft max-w-sm">
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
                    p-4 sm:p-5 card-paper transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4
                    ${
                      appt.status === AppointmentStatus.COMPLETED
                        ? 'bg-paper-dark/60 border-dashed opacity-80'
                        : appt.status === AppointmentStatus.CANCELLED
                        ? 'bg-pole-red-tint/30 border-pole-red opacity-70'
                        : 'shadow-stamp-sm hover:shadow-stamp'
                    }
                  `}
                >
                  {/* Left: Time and Client Info */}
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Time Slot Box */}
                    <div className="px-3.5 py-2 rounded-sm bg-paper-dark border-[1.5px] border-ink text-center shrink-0 shadow-stamp-sm">
                      <span className="font-display text-lg text-pole-red block leading-tight">
                        {appt.start_time}
                      </span>
                      <span className="font-sign uppercase text-[10px] text-ink-muted">
                        {appt.end_time}
                      </span>
                    </div>

                    {/* Customer & Service Details */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base text-ink">
                          {appt.customer_name}
                        </span>
                        {appt.customer_phone && (
                          <span className="font-sign uppercase text-xs text-ink-muted">
                            ({appt.customer_phone})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-ink-soft mt-1 flex-wrap">
                        <span className="font-semibold text-ink">
                          {appt.service_name}
                        </span>
                        <span>•</span>
                        <span>{appt.service_duration} min</span>
                        <span>•</span>
                        <span className="font-display text-sm text-pole-red font-semibold">
                          {formatCurrencyBRL(appt.service_price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Management Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-ink-line">
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
                          className="p-1.5 rounded-sm text-ink-muted hover:text-pole-red hover:bg-pole-red-tint border border-transparent hover:border-pole-red transition-colors"
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
      <div className="p-5 card-paper bg-paper-dark flex items-start gap-3.5 text-xs text-ink-soft shadow-stamp-sm">
        <User size={18} className="text-pole-red shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-ink font-sign uppercase">
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
