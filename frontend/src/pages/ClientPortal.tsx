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

// Initial appointments for demo customer (loaded dynamically from backend)
const INITIAL_APPOINTMENTS: AppointmentResponse[] = [];

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
  // Consume useAuth safely
  let auth: ReturnType<typeof useAuth> | undefined;
  try {
    auth = useAuth();
  } catch {
    auth = undefined;
  }
  const currentCustomer = auth?.currentCustomer ?? null;
  const logoutCustomer = auth?.logoutCustomer ?? (() => {});

  // Reactive customer ID sync: uses current authenticated customer or fallback prop
  const effectiveCustomerId = currentCustomer?.id ?? customerId ?? 1;

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Notifications feedback
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Fetch real packages and appointments from backend if available
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const pkgs = await getCustomerPackages(effectiveCustomerId);
        if (isMounted && pkgs && pkgs.length > 0) {
          setCustomerPackages(pkgs);
        }
      } catch {
        // Keep initial mock packages if backend is offline
      }

      try {
        const apts = await getCustomerAppointments(effectiveCustomerId);
        if (isMounted && apts) {
          setAppointments(apts);
        }
      } catch {
        // Keep initial appointments if backend is offline
      }
    }
    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, [effectiveCustomerId]);

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

    // Refresh packages and appointments from backend to guarantee sync
    getCustomerPackages(effectiveCustomerId).then((pkgs) => {
      if (pkgs) setCustomerPackages(pkgs);
    }).catch(() => {});
    getCustomerAppointments(effectiveCustomerId).then((apts) => {
      if (apts) setAppointments(apts);
    }).catch(() => {});
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

      {/* Customer Identification Banner */}
      {currentCustomer ? (
        <div className="mb-6 p-4 card-paper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-stamp-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-paper-dark border-[1.5px] border-ink flex items-center justify-center text-ink font-bold shrink-0 shadow-stamp-sm">
              <User size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base sm:text-lg text-ink">
                  Olá, {currentCustomer.name}!
                </span>
                <Badge variant="success" size="sm">
                  Identificado
                </Badge>
              </div>
              {currentCustomer.phone && (
                <p className="font-sign uppercase tracking-wider text-xs text-ink-muted mt-0.5">
                  {currentCustomer.phone}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logoutCustomer}
            className="text-xs text-ink-soft hover:text-pole-red hover:border-pole-red"
          >
            Trocar conta / Sair
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 card-paper bg-paper-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-stamp-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-card border-[1.5px] border-ink flex items-center justify-center text-pole-red font-bold shrink-0 shadow-stamp-sm">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg text-ink">
                Identificação do Cliente
              </h3>
              <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-0.5">
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

      {/* 1. Desktop Tab Bar Navigation */}
      <div className="hidden md:flex items-center justify-between border-b-[1.5px] border-ink pb-3 mb-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange('booking')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-sm font-sign uppercase tracking-wider text-sm transition-all select-none
              ${
                activeTab === 'booking'
                  ? 'bg-ink text-card shadow-stamp-sm font-bold'
                  : 'bg-paper-dark text-ink-soft hover:text-ink border border-ink-line'
              }
            `}
          >
            <CalendarPlus size={16} />
            <span>Agendar Horário</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('packages')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-sm font-sign uppercase tracking-wider text-sm transition-all select-none
              ${
                activeTab === 'packages'
                  ? 'bg-ink text-card shadow-stamp-sm font-bold'
                  : 'bg-paper-dark text-ink-soft hover:text-ink border border-ink-line'
              }
            `}
          >
            <Package size={16} />
            <span>Pacotes Promocionais</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('wallet')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-sm font-sign uppercase tracking-wider text-sm transition-all select-none
              ${
                activeTab === 'wallet'
                  ? 'bg-ink text-card shadow-stamp-sm font-bold'
                  : 'bg-paper-dark text-ink-soft hover:text-ink border border-ink-line'
              }
            `}
          >
            <Wallet size={16} />
            <span>Minha Carteira</span>
            {totalActiveCredits > 0 && (
              <span
                className={`
                  px-2 py-0.5 rounded-sm text-xs font-bold font-sign
                  ${
                    activeTab === 'wallet'
                      ? 'bg-card text-ink'
                      : 'bg-pole-red text-card'
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
              flex items-center gap-2 px-4 py-2 rounded-sm font-sign uppercase tracking-wider text-sm transition-all select-none
              ${
                activeTab === 'appointments'
                  ? 'bg-ink text-card shadow-stamp-sm font-bold'
                  : 'bg-paper-dark text-ink-soft hover:text-ink border border-ink-line'
              }
            `}
          >
            <CalendarCheck2 size={16} />
            <span>Meus Horários</span>
            {upcomingCount > 0 && (
              <span
                className={`
                  px-2 py-0.5 rounded-sm text-xs font-bold font-sign
                  ${
                    activeTab === 'appointments'
                      ? 'bg-card text-ink'
                      : 'bg-paper-deep text-ink'
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
          <div className="sign-label flex items-center gap-1.5 text-xs text-ink">
            <span>Saldo:</span>
            <span className="font-display text-base text-pole-red">
              {totalActiveCredits} {totalActiveCredits === 1 ? 'crédito' : 'créditos'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Global Notification Alert Banner */}
      {notification && (
        <div
          className={`
            mb-6 p-4 rounded-sm border-[1.5px] border-l-4 flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 shadow-stamp-sm
            ${
              notification.type === 'success'
                ? 'bg-moss-tint border-moss border-l-moss text-moss'
                : notification.type === 'error'
                ? 'bg-pole-red-tint border-pole-red border-l-pole-red text-pole-red'
                : 'bg-pole-blue-tint border-pole-blue border-l-pole-blue text-pole-blue'
            }
          `}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-moss" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="font-sign uppercase tracking-wider text-xs opacity-75 hover:opacity-100 underline shrink-0"
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
            <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight">
              Agendamento de Horário
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-2xl font-medium">
              Escolha seu barbeiro de preferência, selecione o serviço e garanta seu horário.
              Se possuir créditos de pacote, você poderá utilizá-los no próximo passo.
            </p>
          </div>

          {/* Step 1: Professional Selector */}
          <div className="space-y-3">
            <div className="sign-label flex items-center gap-2 text-ink text-sm">
              <User size={14} className="text-pole-red" />
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
                      p-4 card-paper text-left flex items-center justify-between transition-all select-none
                      ${
                        isSelected
                          ? 'border-pole-red shadow-stamp ring-1 ring-pole-red'
                          : 'shadow-stamp-sm hover:shadow-stamp hover:border-ink'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-sm border-[1.5px] border-ink flex items-center justify-center font-display text-base ${
                          isSelected
                            ? 'bg-pole-red text-card'
                            : 'bg-paper-dark text-ink'
                        }`}
                      >
                        {prof.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-display text-base text-ink">{prof.name}</div>
                        <div className="font-sign uppercase tracking-wider text-xs text-ink-muted">Barbeiro Especialista</div>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} className="text-pole-red shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Service Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="sign-label flex items-center gap-2 text-ink text-sm">
                <span>2. Selecione o Serviço</span>
              </div>
              <span className="font-sign uppercase tracking-wider text-xs text-ink-muted">
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
            <div className="space-y-4 pt-4 border-t-[1.5px] border-ink">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl text-ink">
                    3. Escolha o Dia e Horário Disponível
                  </h2>
                  <p className="font-sign uppercase tracking-wider text-xs text-ink-soft mt-0.5">
                    Atendimento com {selectedProfessional.name} • {selectedService.name} (
                    {selectedService.duration_minutes} min)
                  </p>
                </div>
              </div>

              <div className="card-paper p-5 sm:p-6 shadow-stamp-sm">
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
                <div className="p-4 sm:p-5 card-paper bg-card border-pole-red flex flex-col sm:flex-row items-center justify-between gap-4 shadow-stamp animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className="w-10 h-10 rounded-sm bg-pole-red text-card border border-ink flex items-center justify-center font-bold shrink-0 shadow-stamp-sm">
                      <CalendarCheck2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-display text-base text-ink">
                        Horário Selecionado:{' '}
                        <span className="text-pole-red font-sign uppercase">{selectedSlot.start_time}</span>
                      </h4>
                      <p className="font-sign uppercase tracking-wider text-xs text-ink-soft">
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-paper-dark border-[1.5px] border-ink text-ink font-sign uppercase tracking-wider text-xs font-semibold mb-2 shadow-stamp-sm">
              <span>Economize até 30% em seus cortes</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight">
              Pacotes Promocionais
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-2xl font-medium">
              Compre antecipado e acumule créditos na sua carteira digital. Seus créditos
              são debitados automaticamente ao agendar e estornados se você cancelar com mais de 2 horas de antecedência.
            </p>
          </div>

          {/* Guarantee Pill */}
          <div className="p-4 card-paper bg-paper-dark flex items-center gap-3 text-xs sm:text-sm text-ink shadow-stamp-sm">
            <ShieldCheck size={24} className="text-pole-red shrink-0" />
            <div>
              <span className="font-display text-base text-ink">
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
              <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight">
                Minha Carteira de Créditos
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-xl font-medium">
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
          <div className="p-5 sm:p-6 card-paper grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-stamp-sm">
            <div className="p-4 rounded-sm bg-paper-dark border-[1.5px] border-ink shadow-sm">
              <span className="sign-label">
                Total de Créditos Ativos
              </span>
              <div className="font-display text-3xl sm:text-4xl text-pole-red mt-1">
                {totalActiveCredits}
              </div>
              <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted mt-0.5 block">
                Disponíveis para agendamento imediato
              </span>
            </div>

            <div className="p-4 rounded-sm bg-paper-dark border-[1.5px] border-ink shadow-sm">
              <span className="sign-label">
                Pacotes Ativos
              </span>
              <div className="font-display text-3xl sm:text-4xl text-ink mt-1">
                {
                  customerPackages.filter(
                    (p) => p.status === PackageStatus.ACTIVE
                  ).length
                }
              </div>
              <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted mt-0.5 block">
                Vinculados ao seu perfil de cliente
              </span>
            </div>

            <div className="p-4 rounded-sm bg-paper-dark border-[1.5px] border-ink shadow-sm">
              <span className="sign-label">
                Agendamentos Futuros
              </span>
              <div className="font-display text-3xl sm:text-4xl text-ink mt-1">
                {upcomingCount}
              </div>
              <span className="font-sign uppercase tracking-wider text-[11px] text-ink-muted mt-0.5 block">
                Horários reservados no salão
              </span>
            </div>
          </div>

          {/* Wallet Balance Details */}
          <div>
            <h2 className="font-display text-xl text-ink mb-4">
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
            <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight">
              Meus Agendamentos
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-xl font-medium">
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
        onSuccess={(c) => {
          showNotification('success', `Bem-vindo(a), ${c.name}!`);
        }}
      />
    </div>
  );
};

export default ClientPortal;
