import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarPlus,
  Package,
  Wallet,
  CalendarCheck2,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import {
  Service,
  Professional,
  PackageResponse,
  CustomerPackageResponse,
  AppointmentResponse,
  AvailableSlot,
  PackageStatus,
  AppointmentStatus,
  PaymentType,
} from '../types/api';
import { ServiceCard } from '../components/booking/ServiceCard';
import { SlotPicker, toLocalDateString } from '../components/booking/SlotPicker';
import { BookingModal } from '../components/booking/BookingModal';
import { PackageCard } from '../components/packages/PackageCard';
import { WalletBalance } from '../components/packages/WalletBalance';
import { AppointmentList } from '../components/appointments/AppointmentList';
import { Button, InstallAppBanner, Badge } from '../components/common';
import { ClientNavTab } from '../components/layout/BottomNav';
import { purchasePackage, getCustomerPackages } from '../api/packages';
import { getCustomerAppointments } from '../api/appointments';
import { useAuth } from '../context/AuthContext';
import { CustomerLoginModal } from '../components/auth/CustomerLoginModal';

// Default initial mock services
const DEFAULT_SERVICES: Service[] = [
  {
    id: 1,
    name: 'Corte Tradicional Masculino',
    description: 'Corte na tesoura e máquina com lavagem especial, finalização com pomada modeladora e toalha quente.',
    duration_minutes: 30,
    price: 45.0,
    is_active: true,
  },
  {
    id: 2,
    name: 'Barba Terapia Completa',
    description: 'Desenho de barba com navalhete descartável, esfoliação facial, hidratação com óleos essenciais e toalha quente aromática.',
    duration_minutes: 30,
    price: 35.0,
    is_active: true,
  },
  {
    id: 3,
    name: 'Combo Cabelo + Barba',
    description: 'Experiência completa da barbearia: corte masculino e barba terapia completa com tratamento capilar.',
    duration_minutes: 60,
    price: 70.0,
    is_active: true,
  },
  {
    id: 4,
    name: 'Acabamento & Pezinho',
    description: 'Alinhamento dos contornos, costeletas e pezinho com lâmina descartável e pós-barba refrescante.',
    duration_minutes: 15,
    price: 20.0,
    is_active: true,
  },
];

// Default initial professionals
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

// Available packages for purchase
const AVAILABLE_PACKAGES: PackageResponse[] = [
  {
    id: 1,
    name: 'Combo 4 Cortes Masculinos',
    description: 'Garanta 4 cortes de cabelo com desconto exclusivo. Validade estendida e cancelamento com estorno garantido.',
    price: 140.0,
    validity_days: 60,
    is_active: true,
    items: [
      { id: 1, service_id: 1, quantity: 4 },
    ],
  },
  {
    id: 2,
    name: 'Plano Barba Mensal (4 Sessões)',
    description: 'Mantenha sua barba impecável o mês inteiro com 4 atendimentos de barboterapia.',
    price: 110.0,
    validity_days: 45,
    is_active: true,
    items: [
      { id: 2, service_id: 2, quantity: 4 },
    ],
  },
  {
    id: 3,
    name: 'Pacote VIP Completo (2 Cortes + 2 Barbas)',
    description: 'O pacote mais vantajoso para cuidar do visual completo com economia e prioridade.',
    price: 135.0,
    validity_days: 60,
    is_active: true,
    items: [
      { id: 3, service_id: 1, quantity: 2 },
      { id: 4, service_id: 2, quantity: 2 },
    ],
  },
];

export interface ClientPortalProps {
  activeTab: ClientNavTab;
  onTabChange: (tab: ClientNavTab) => void;
  className?: string;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const { currentCustomer, logoutCustomer } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Core Data States
  const [services] = useState<Service[]>(DEFAULT_SERVICES);
  const [professionals] = useState<Professional[]>(DEFAULT_PROFESSIONALS);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackageResponse[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);

  // Selection states for booking flow
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(
    DEFAULT_PROFESSIONALS[0]
  );
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateString(new Date())
  );
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Feedback notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Efficient mappings for names
  const servicesMap = useMemo(() => {
    return services.reduce<Record<number, string>>((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});
  }, [services]);

  const professionalsMap = useMemo(() => {
    return professionals.reduce<Record<number, string>>((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
  }, [professionals]);

  const packagesMap = useMemo(() => {
    return AVAILABLE_PACKAGES.reduce<Record<number, string>>((acc, pkg) => {
      acc[pkg.id] = pkg.name;
      return acc;
    }, {});
  }, []);

  // Compute total available credits per service for badges
  const serviceCreditsMap = useMemo(() => {
    const map: Record<number, number> = {};
    const now = new Date();

    customerPackages.forEach((pkg) => {
      if (pkg.status !== PackageStatus.ACTIVE) return;
      if (new Date(pkg.expires_at) <= now) return;

      pkg.balances?.forEach((bal) => {
        map[bal.service_id] = (map[bal.service_id] || 0) + bal.remaining_quantity;
      });
    });

    return map;
  }, [customerPackages]);

  // Total active credits across all services
  const totalActiveCredits = useMemo(() => {
    return Object.values(serviceCreditsMap).reduce((a, b) => a + b, 0);
  }, [serviceCreditsMap]);

  // Count upcoming appointments
  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return appointments.filter((appt) => {
      const isBooked =
        appt.status === AppointmentStatus.BOOKED ||
        appt.status === AppointmentStatus.CONFIRMED;
      return isBooked && new Date(appt.start_time).getTime() > now;
    }).length;
  }, [appointments]);

  const effectiveCustomerId = currentCustomer?.id ?? 1;

  // Load customer packages & appointments
  const loadUserData = useCallback(async () => {
    try {
      const [pkgs, appts] = await Promise.all([
        getCustomerPackages(effectiveCustomerId).catch(() => []),
        getCustomerAppointments(effectiveCustomerId).catch(() => []),
      ]);

      if (pkgs && pkgs.length > 0) {
        setCustomerPackages(pkgs);
      } else {
        // Initial mock balance if new customer
        setCustomerPackages([
          {
            id: 101,
            customer_id: effectiveCustomerId,
            package_id: 1,
            status: PackageStatus.ACTIVE,
            purchased_at: new Date(Date.now() - 5 * 86400000).toISOString(),
            expires_at: new Date(Date.now() + 55 * 86400000).toISOString(),
            balances: [
              {
                id: 1,
                customer_package_id: 101,
                service_id: 1,
                total_quantity: 4,
                remaining_quantity: 3,
              },
            ],
          },
        ]);
      }

      if (appts && appts.length > 0) {
        setAppointments(appts);
      } else {
        // Initial sample appointment
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 2);
        nextDay.setHours(14, 0, 0, 0);

        setAppointments([
          {
            id: 201,
            customer_id: effectiveCustomerId,
            professional_id: 1,
            service_id: 1,
            start_time: nextDay.toISOString(),
            end_time: new Date(nextDay.getTime() + 30 * 60000).toISOString(),
            status: AppointmentStatus.BOOKED,
            payment_type: PaymentType.PACKAGE_CREDIT,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Fallback
    }
  }, [effectiveCustomerId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'info', message: string) => {
      setNotification({ type, message });
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    },
    []
  );

  // Purchase Package Handler
  const handlePurchasePackage = async (packageId: number) => {
    try {
      const selectedPkg = AVAILABLE_PACKAGES.find((p) => p.id === packageId);
      if (!selectedPkg) return;

      try {
        const result = await purchasePackage({
          customer_id: effectiveCustomerId,
          package_id: packageId,
        });

        setCustomerPackages((prev) => [result, ...prev]);
        showNotification(
          'success',
          `Pacote "${selectedPkg.name}" adquirido com sucesso! Seus créditos já foram creditados na carteira.`
        );
      } catch {
        // Fallback simulate package addition locally
        const simulated: CustomerPackageResponse = {
          id: Date.now(),
          customer_id: effectiveCustomerId,
          package_id: packageId,
          status: PackageStatus.ACTIVE,
          purchased_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + selectedPkg.validity_days * 24 * 60 * 60 * 1000
          ).toISOString(),
          balances: selectedPkg.items.map((it, idx) => ({
            id: Date.now() + idx,
            customer_package_id: Date.now(),
            service_id: it.service_id,
            total_quantity: it.quantity,
            remaining_quantity: it.quantity,
          })),
        };

        setCustomerPackages((prev) => [simulated, ...prev]);
        showNotification(
          'success',
          `Pacote "${selectedPkg.name}" adquirido com sucesso! Seus créditos já estão prontos para uso.`
        );
      }

      onTabChange('wallet');
    } catch (err: any) {
      showNotification(
        'error',
        err?.message || 'Falha ao processar a compra do pacote. Tente novamente.'
      );
    }
  };

  // Booking Success Handler
  const handleBookingSuccess = (newAppointment: AppointmentResponse) => {
    setAppointments((prev) => [newAppointment, ...prev]);

    if (newAppointment.payment_type === PaymentType.PACKAGE_CREDIT) {
      setCustomerPackages((prev) => {
        let deducted = false;
        return prev.map((pkg) => {
          if (deducted || pkg.status !== PackageStatus.ACTIVE) return pkg;

          const hasTargetBalance = pkg.balances?.some(
            (b) =>
              b.service_id === newAppointment.service_id &&
              b.remaining_quantity > 0
          );

          if (!hasTargetBalance) return pkg;

          deducted = true;
          return {
            ...pkg,
            balances: pkg.balances.map((b) => {
              if (
                b.service_id === newAppointment.service_id &&
                b.remaining_quantity > 0
              ) {
                return {
                  ...b,
                  remaining_quantity: b.remaining_quantity - 1,
                };
              }
              return b;
            }),
          };
        });
      });
    }

    showNotification(
      'success',
      'Agendamento confirmado com sucesso! Você pode acompanhá-lo na aba Meus Horários.'
    );
    setSelectedSlot(null);
  };

  // Cancel Appointment Callback
  const handleCancelAppointment = (cancelledAppointment: AppointmentResponse) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === cancelledAppointment.id ? cancelledAppointment : a))
    );

    if (cancelledAppointment.payment_type === PaymentType.PACKAGE_CREDIT) {
      setCustomerPackages((prev) => {
        let refunded = false;
        return prev.map((pkg) => {
          if (refunded || pkg.status !== PackageStatus.ACTIVE) return pkg;

          const targetBal = pkg.balances?.find(
            (b) => b.service_id === cancelledAppointment.service_id
          );

          if (!targetBal) return pkg;

          refunded = true;
          return {
            ...pkg,
            balances: pkg.balances.map((b) => {
              if (b.service_id === cancelledAppointment.service_id) {
                return {
                  ...b,
                  remaining_quantity: Math.min(
                    b.total_quantity,
                    b.remaining_quantity + 1
                  ),
                };
              }
              return b;
            }),
          };
        });
      });
    }

    showNotification(
      'info',
      'Agendamento cancelado com sucesso. Verifique os detalhes na listagem.'
    );
  };

  const handleUseCreditFromWallet = (
    _customerPackageId: number,
    serviceId: number
  ) => {
    const s = services.find((serv) => serv.id === serviceId);
    if (s) {
      setSelectedService(s);
    }
    onTabChange('booking');
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-mobile-nav md:pb-12 ${className}`}>
      {/* PWA Install Banner */}
      <InstallAppBanner className="mb-6" />

      {/* Customer Identification Banner */}
      {currentCustomer ? (
        <div className="mb-6 p-4 card-clean flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 font-bold shrink-0">
              <User size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-slate-900">
                  Olá, {currentCustomer.name}!
                </span>
                <Badge variant="success" size="sm">
                  Identificado
                </Badge>
              </div>
              {currentCustomer.phone && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentCustomer.phone}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logoutCustomer}
            className="text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200"
          >
            Trocar conta / Sair
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 card-clean flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 font-bold shrink-0">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900">
                Identificação do Cliente
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifique-se com seu WhatsApp para ver seus pacotes e créditos acumulados
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full sm:w-auto shrink-0"
          >
            Entrar / Identificar
          </Button>
        </div>
      )}

      {/* 1. Desktop Tab Bar Navigation (Apple style) */}
      <div className="hidden md:flex items-center justify-between pb-3 mb-8 border-b border-slate-100">
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 select-none">
          <button
            type="button"
            onClick={() => onTabChange('booking')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all select-none
              ${
                activeTab === 'booking'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <CalendarPlus size={15} />
            <span>Agendar Horário</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('packages')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all select-none
              ${
                activeTab === 'packages'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <Package size={15} />
            <span>Pacotes Promocionais</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('wallet')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all select-none
              ${
                activeTab === 'wallet'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <Wallet size={15} />
            <span>Minha Carteira</span>
            {totalActiveCredits > 0 && (
              <span
                className={`
                  px-1.5 py-0.2 rounded-full text-[10px] font-bold
                  ${
                    activeTab === 'wallet'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }
                `}
              >
                {totalActiveCredits}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('appointments')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all select-none
              ${
                activeTab === 'appointments'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            <CalendarCheck2 size={15} />
            <span>Meus Horários</span>
            {upcomingCount > 0 && (
              <span
                className={`
                  px-1.5 py-0.2 rounded-full text-[10px] font-bold
                  ${
                    activeTab === 'appointments'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }
                `}
              >
                {upcomingCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick balance badge on right */}
        {totalActiveCredits > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/60">
            <span>Saldo:</span>
            <span className="font-bold text-slate-900">
              {totalActiveCredits} {totalActiveCredits === 1 ? 'crédito' : 'créditos'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Global Notification Alert Banner */}
      {notification && (
        <div
          className={`
            mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 shadow-xs
            ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-sky-50 border-sky-200 text-sky-800'
            }
          `}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs opacity-75 hover:opacity-100 underline shrink-0 font-medium"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: AGENDAR */}
      {/* ========================================================================= */}
      {activeTab === 'booking' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Header Intro */}
          <div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Agendamento de Horário
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-normal">
              Escolha seu barbeiro de preferência, selecione o serviço e garanta seu horário.
              Se possuir créditos de pacote, você poderá utilizá-los no próximo passo.
            </p>
          </div>

          {/* Step 1: Professional Selector */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <span>1. Escolha o Profissional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {professionals.map((prof) => {
                const isSelected = selectedProfessional.id === prof.id;

                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfessional(prof);
                      setSelectedSlot(null);
                    }}
                    className={`
                      p-4 card-clean text-left flex items-center justify-between transition-all select-none
                      ${
                        isSelected
                          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                          : 'hover:border-slate-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {prof.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm sm:text-base text-slate-900">{prof.name}</div>
                        <div className="text-xs text-slate-500">Barbeiro Especialista</div>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} className="text-slate-900 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Service Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                2. Selecione o Serviço
              </div>
              <span className="text-xs text-slate-400">
                {services.length} opções disponíveis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => {
                const isSelected = selectedService?.id === service.id;
                const credits = serviceCreditsMap[service.id] || 0;

                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={isSelected}
                    creditsAvailable={credits}
                    onSelect={(serv) => {
                      setSelectedService(serv);
                      setSelectedSlot(null);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Step 3: Date & Slot Picker */}
          {selectedService && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-slate-900 tracking-tight">
                    3. Escolha o Dia e Horário Disponível
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atendimento com {selectedProfessional.name} • {selectedService.name} (
                    {selectedService.duration_minutes} min)
                  </p>
                </div>
              </div>

              <div className="card-clean p-5 sm:p-6">
                <SlotPicker
                  professionalId={selectedProfessional.id}
                  serviceId={selectedService.id}
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  onDateChange={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  onSelectSlot={(slot, date) => {
                    setSelectedSlot(slot);
                    setSelectedDate(date);
                  }}
                />
              </div>

              {/* Booking Confirmation Action Bar */}
              {selectedSlot && (
                <div className="p-4 sm:p-5 card-clean bg-white border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <CalendarCheck2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-slate-900">
                        Horário Selecionado:{' '}
                        <span className="text-blue-600 font-bold">{selectedSlot.start_time}</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedService.name} com {selectedProfessional.name} em {selectedDate}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setIsBookingModalOpen(true)}
                    rightIcon={<ChevronRight size={18} />}
                    className="w-full sm:w-auto"
                  >
                    Revisar & Confirmar Agendamento
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Booking Modal */}
          {selectedService && selectedSlot && (
            <BookingModal
              isOpen={isBookingModalOpen}
              onClose={() => setIsBookingModalOpen(false)}
              service={selectedService}
              professional={selectedProfessional}
              slot={selectedSlot}
              selectedDate={selectedDate}
              customerPackages={customerPackages}
              onSuccess={handleBookingSuccess}
              onSlotConflict={() => {
                setSelectedSlot(null);
                showNotification(
                  'error',
                  'Este horário acabou de ser reservado por outro cliente. Por favor, escolha outro slot.'
                );
              }}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PACOTES */}
      {/* ========================================================================= */}
      {activeTab === 'packages' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-2">
              <span>Economize até 30% em seus cortes</span>
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Pacotes Promocionais
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-normal">
              Compre antecipado e acumule créditos na sua carteira digital. Seus créditos
              são debitados automaticamente ao agendar e estornados se você cancelar com mais de 2 horas de antecedência.
            </p>
          </div>

          {/* Guarantee Pill */}
          <div className="p-4 card-clean bg-slate-50/70 border-slate-200/70 flex items-center gap-3 text-xs sm:text-sm text-slate-700">
            <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-900">
                Garantia de Reembolso Automático:
              </span>{' '}
              Se precisar desmarcar com ao menos 2h de antecedência, seu crédito retorna
              imediatamente para a carteira. Sem burocracia ou perda de créditos.
            </div>
          </div>

          {/* Packages Showcase Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AVAILABLE_PACKAGES.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                servicesMap={servicesMap}
                onPurchase={handlePurchasePackage}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CARTEIRA */}
      {/* ========================================================================= */}
      {activeTab === 'wallet' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Minha Carteira de Créditos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl font-normal">
                Acompanhe o saldo dos seus pacotes adquiridos, datas de validade e use seus créditos para novos agendamentos.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => onTabChange('packages')}
              leftIcon={<Package size={16} />}
            >
              Comprar Novo Pacote
            </Button>
          </div>

          {/* Wallet Overview Summary Card */}
          <div className="p-5 sm:p-6 card-clean grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total de Créditos Ativos
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tabular-nums">
                {totalActiveCredits}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Disponíveis para agendamento imediato
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pacotes Ativos
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tabular-nums">
                {
                  customerPackages.filter(
                    (p) => p.status === PackageStatus.ACTIVE
                  ).length
                }
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Vinculados ao seu perfil de cliente
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Agendamentos Futuros
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1 tabular-nums">
                {upcomingCount}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Horários reservados no salão
              </span>
            </div>
          </div>

          {/* Wallet Balance Details */}
          <div>
            <h2 className="font-bold text-lg text-slate-900 mb-4">
              Pacotes e Saldos por Serviço
            </h2>
            <WalletBalance
              packages={customerPackages}
              servicesMap={servicesMap}
              packagesMap={packagesMap}
              onBuyPackageClick={() => onTabChange('packages')}
              onUseCreditClick={handleUseCreditFromWallet}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MEUS HORÁRIOS */}
      {/* ========================================================================= */}
      {activeTab === 'appointments' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Meus Agendamentos
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl font-normal">
              Consulte seus atendimentos futuros e histórico de cortes. Você pode cancelar
              com estorno automático até 2 horas antes do horário marcado.
            </p>
          </div>

          <AppointmentList
            appointments={appointments}
            servicesMap={servicesMap}
            professionalsMap={professionalsMap}
            cancellationWindowHours={2}
            onCancelSuccess={handleCancelAppointment}
            onBookNewClick={() => onTabChange('booking')}
          />
        </div>
      )}

      {/* Customer Login Modal */}
      <CustomerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          showNotification('success', 'Identificado com sucesso!');
        }}
      />
    </div>
  );
};

export default ClientPortal;
