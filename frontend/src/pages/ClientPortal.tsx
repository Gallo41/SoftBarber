import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarPlus,
  Package,
  Wallet,
  CalendarCheck2,
  Sparkles,
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
import { Button, InstallAppBanner } from '../components/common';
import { ClientNavTab } from '../components/layout/BottomNav';
import { purchasePackage, getCustomerPackages } from '../api/packages';

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
    name: 'Clube VIP Barba & Cabelo (4x + 4x)',
    description: 'Pacote premium completo: 4 cortes masculinos e 4 barba terapias. Máxima economia para manter o visual impecável.',
    price: 220.0,
    validity_days: 90,
    is_active: true,
    items: [
      { id: 2, service_id: 1, quantity: 4 },
      { id: 3, service_id: 2, quantity: 4 },
    ],
  },
  {
    id: 3,
    name: 'Pacote Barba Clássica (3x)',
    description: '3 sessões de barba terapia com toalha quente e esfoliação. Ideal para quem cuida da barba toda quinzena.',
    price: 85.0,
    validity_days: 45,
    is_active: true,
    items: [
      { id: 4, service_id: 2, quantity: 3 },
    ],
  },
];

// Initial customer package with active credits
const INITIAL_CUSTOMER_PACKAGES: CustomerPackageResponse[] = [
  {
    id: 101,
    customer_id: 1,
    package_id: 1,
    status: PackageStatus.ACTIVE,
    purchased_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
    balances: [
      {
        id: 201,
        customer_package_id: 101,
        service_id: 1,
        total_quantity: 4,
        remaining_quantity: 3,
      },
    ],
  },
];

// Initial appointments for demo customer
const INITIAL_APPOINTMENTS: AppointmentResponse[] = [
  {
    id: 501,
    professional_id: 1,
    customer_id: 1,
    service_id: 1,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T14:30:00',
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T15:00:00',
    status: AppointmentStatus.BOOKED,
    payment_type: PaymentType.PACKAGE_CREDIT,
    created_at: new Date().toISOString(),
  },
  {
    id: 489,
    professional_id: 2,
    customer_id: 1,
    service_id: 2,
    start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T11:00:00',
    end_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T11:30:00',
    status: AppointmentStatus.COMPLETED,
    payment_type: PaymentType.PACKAGE_CREDIT,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export interface ClientPortalProps {
  activeTab: ClientNavTab;
  onTabChange: (tab: ClientNavTab) => void;
  customerId?: number;
  className?: string;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  activeTab,
  onTabChange,
  customerId = 1,
  className = '',
}) => {
  // Master lists
  const [services] = useState<Service[]>(DEFAULT_SERVICES);
  const [professionals] = useState<Professional[]>(DEFAULT_PROFESSIONALS);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackageResponse[]>(
    INITIAL_CUSTOMER_PACKAGES
  );
  const [appointments, setAppointments] = useState<AppointmentResponse[]>(
    INITIAL_APPOINTMENTS
  );

  // Booking Flow State
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(
    DEFAULT_PROFESSIONALS[0]
  );
  const [selectedService, setSelectedService] = useState<Service | null>(
    DEFAULT_SERVICES[0]
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateString(new Date())
  );
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Notifications feedback
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Fetch real packages from backend if available
  useEffect(() => {
    let isMounted = true;
    async function loadBackendPackages() {
      try {
        const pkgs = await getCustomerPackages(customerId);
        if (isMounted && pkgs && pkgs.length > 0) {
          setCustomerPackages(pkgs);
        }
      } catch {
        // Keep initial mock packages if backend is offline
      }
    }
    loadBackendPackages();
    return () => {
      isMounted = false;
    };
  }, [customerId]);

  // Lookup maps for IDs to display names
  const servicesMap = useMemo(() => {
    const map: Record<number, string> = {};
    services.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [services]);

  const professionalsMap = useMemo(() => {
    const map: Record<number, string> = {};
    professionals.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [professionals]);

  const packagesMap = useMemo(() => {
    const map: Record<number, string> = {};
    AVAILABLE_PACKAGES.forEach((pkg) => {
      map[pkg.id] = pkg.name;
    });
    return map;
  }, []);

  // Credit balance calculation per service ID
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
    return Object.values(serviceCreditsMap).reduce((acc, curr) => acc + curr, 0);
  }, [serviceCreditsMap]);

  // Count upcoming appointments
  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return appointments.filter(
      (a) =>
        (a.status === AppointmentStatus.BOOKED ||
          a.status === AppointmentStatus.CONFIRMED) &&
        new Date(a.start_time).getTime() > now
    ).length;
  }, [appointments]);

  // Show banner alert with auto-dismiss
  const showNotification = useCallback(
    (type: 'success' | 'info' | 'error', message: string) => {
      setNotification({ type, message });
      setTimeout(() => {
        setNotification(null);
      }, 6000);
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
          customer_id: customerId,
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
          customer_id: customerId,
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

      // Switch to wallet tab so client immediately sees their new balance
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
    // Add to appointments list
    setAppointments((prev) => [newAppointment, ...prev]);

    // If booked with package credit, deduct 1 credit from customer packages state
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

    // If it was paid with package credit, refund 1 credit to user's wallet
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

      showNotification(
        'info',
        'Agendamento cancelado dentro do prazo de 2h. 1 crédito foi estornado para sua carteira!'
      );
    } else {
      showNotification('info', 'Agendamento cancelado com sucesso.');
    }
  };

  // Action to start booking directly using a service with active credits
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

      {/* 1. Desktop Tab Bar Navigation */}
      <div className="hidden md:flex items-center justify-between border-b border-zinc-800 pb-4 mb-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange('booking')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all select-none
              ${
                activeTab === 'booking'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }
            `}
          >
            <CalendarPlus size={18} />
            <span>Agendar Horário</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('packages')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all select-none
              ${
                activeTab === 'packages'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }
            `}
          >
            <Package size={18} />
            <span>Pacotes Promocionais</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('wallet')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all select-none
              ${
                activeTab === 'wallet'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }
            `}
          >
            <Wallet size={18} />
            <span>Minha Carteira</span>
            {totalActiveCredits > 0 && (
              <span
                className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${
                    activeTab === 'wallet'
                      ? 'bg-zinc-950 text-amber-400'
                      : 'bg-amber-500/20 text-amber-300'
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
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all select-none
              ${
                activeTab === 'appointments'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }
            `}
          >
            <CalendarCheck2 size={18} />
            <span>Meus Horários</span>
            {upcomingCount > 0 && (
              <span
                className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${
                    activeTab === 'appointments'
                      ? 'bg-zinc-950 text-amber-400'
                      : 'bg-zinc-800 text-zinc-300'
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
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles size={14} className="text-amber-400" />
            <span>Saldo:</span>
            <span className="font-bold text-amber-400">
              {totalActiveCredits} {totalActiveCredits === 1 ? 'crédito' : 'créditos'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Global Notification Alert Banner */}
      {notification && (
        <div
          className={`
            mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200
            ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }
          `}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-amber-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 underline shrink-0"
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Agendamento de Horário
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Escolha seu barbeiro de preferência, selecione o serviço e garanta seu horário.
              Se possuir créditos de pacote, você poderá utilizá-los no próximo passo.
            </p>
          </div>

          {/* Step 1: Professional Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <User size={16} className="text-amber-400" />
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
                      p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-150 select-none
                      ${
                        isSelected
                          ? 'bg-zinc-900 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {prof.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100">{prof.name}</div>
                        <div className="text-xs text-zinc-400">Barbeiro Especialista</div>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} className="text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Service Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <Sparkles size={16} className="text-amber-400" />
                <span>2. Selecione o Serviço</span>
              </div>
              <span className="text-xs text-zinc-400">
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
            <div className="space-y-4 pt-4 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                    3. Escolha o Dia e Horário Disponível
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Atendimento com {selectedProfessional.name} • {selectedService.name} (
                    {selectedService.duration_minutes} min)
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6">
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
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shrink-0">
                      <CalendarCheck2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-zinc-100">
                        Horário Selecionado:{' '}
                        <span className="text-amber-400">{selectedSlot.start_time}</span>
                      </h4>
                      <p className="text-xs text-zinc-400">
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
              <Sparkles size={13} />
              <span>Economize até 30% em seus cortes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Pacotes Promocionais
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Compre antecipado e acumule créditos na sua carteira digital. Seus créditos
              são debitados automaticamente ao agendar e estornados se você cancelar com mais de 2 horas de antecedência.
            </p>
          </div>

          {/* Guarantee Pill */}
          <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
            <ShieldCheck size={24} className="text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-100">
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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                Minha Carteira de Créditos
              </h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-xl">
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
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                Total de Créditos Ativos
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                {totalActiveCredits}
              </div>
              <span className="text-xs text-zinc-400 mt-0.5 block">
                Disponíveis para agendamento imediato
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                Pacotes Ativos
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mt-1">
                {
                  customerPackages.filter(
                    (p) => p.status === PackageStatus.ACTIVE
                  ).length
                }
              </div>
              <span className="text-xs text-zinc-400 mt-0.5 block">
                Vinculados ao seu perfil de cliente
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                Agendamentos Futuros
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mt-1">
                {upcomingCount}
              </div>
              <span className="text-xs text-zinc-400 mt-0.5 block">
                Horários reservados no salão
              </span>
            </div>
          </div>

          {/* Wallet Balance Details */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 mb-4">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Meus Agendamentos
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
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
    </div>
  );
};

export default ClientPortal;
