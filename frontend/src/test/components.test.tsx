import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PackageCard, formatCurrencyBRL } from '../components/packages/PackageCard';
import { WalletBalance } from '../components/packages/WalletBalance';
import {
  PackageStatus,
  AppointmentStatus,
  PackageResponse,
  CustomerPackageResponse,
} from '../types/api';

describe('Button Component', () => {
  it('renders children text correctly', () => {
    render(<Button>Clique Aqui</Button>);
    expect(screen.getByRole('button', { name: /clique aqui/i })).toBeInTheDocument();
  });

  it('renders primary variant by default and applies styling', () => {
    render(<Button>Primário</Button>);
    const button = screen.getByRole('button', { name: /primário/i });
    expect(button.className).toContain('bg-amber-500');
  });

  it('renders other variants (outline, danger, secondary, ghost)', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button').className).toContain('border-zinc-700');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button').className).toContain('bg-red-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-zinc-800');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('hover:bg-zinc-800/60');
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Ação</Button>);
    fireEvent.click(screen.getByRole('button', { name: /ação/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not trigger click handler when disabled is true', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Desabilitado
      </Button>
    );
    const button = screen.getByRole('button', { name: /desabilitado/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner, custom loading text and is disabled when isLoading is true', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading loadingText="Carregando..." onClick={handleClick}>
        Salvar
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders left and right icons when provided', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        Navegar
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByText('Navegar')).toBeInTheDocument();
  });
});

describe('Badge Component', () => {
  it('renders custom children when provided', () => {
    render(<Badge>Custom Badge</Badge>);
    expect(screen.getByText('Custom Badge')).toBeInTheDocument();
  });

  it('maps PackageStatus.ACTIVE correctly to Ativo with success styles', () => {
    const { container } = render(<Badge status={PackageStatus.ACTIVE} />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-emerald-400');
  });

  it('maps PackageStatus.EXPIRED correctly to Expirado', () => {
    render(<Badge status={PackageStatus.EXPIRED} />);
    expect(screen.getByText('Expirado')).toBeInTheDocument();
  });

  it('maps PackageStatus.EXHAUSTED correctly to Esgotado', () => {
    render(<Badge status={PackageStatus.EXHAUSTED} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('maps AppointmentStatus.BOOKED and CONFIRMED correctly', () => {
    const { rerender } = render(<Badge status={AppointmentStatus.BOOKED} />);
    expect(screen.getByText('Agendado')).toBeInTheDocument();

    rerender(<Badge status={AppointmentStatus.CONFIRMED} />);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('maps AppointmentStatus.COMPLETED and NO_SHOW correctly', () => {
    const { rerender } = render(<Badge status={AppointmentStatus.COMPLETED} />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();

    rerender(<Badge status={AppointmentStatus.NO_SHOW} />);
    expect(screen.getByText('Não Compareceu')).toBeInTheDocument();
  });

  it('respects variant prop override', () => {
    const { container } = render(<Badge variant="danger">Alerta</Badge>);
    expect(container.firstChild).toHaveClass('text-rose-400');
  });

  it('hides indicator dot when dot={false}', () => {
    const { container } = render(<Badge dot={false}>Sem Ponto</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeNull();
  });
});

describe('PackageCard Component', () => {
  const mockPackage: PackageResponse = {
    id: 1,
    name: 'Combo Barba & Cabelo VIP',
    description: 'Pacote completo com 4 cortes e 4 barbas.',
    price: 180.0,
    validity_days: 60,
    is_active: true,
    items: [
      { id: 10, service_id: 1, quantity: 4 },
      { id: 11, service_id: 2, quantity: 4 },
    ],
  };

  const servicesMap: Record<number, string> = {
    1: 'Corte Degrade',
    2: 'Barba Terapia',
  };

  it('formats currency correctly in Brazilian Real format', () => {
    expect(formatCurrencyBRL(180)).toMatch(/R\$\s*180,00/);
    expect(formatCurrencyBRL('99.9')).toMatch(/R\$\s*99,90/);
    expect(formatCurrencyBRL('invalid')).toBe('R$ 0,00');
  });

  it('renders package title, validity, description, and price', () => {
    render(
      <PackageCard
        pkg={mockPackage}
        servicesMap={servicesMap}
        onPurchase={vi.fn()}
      />
    );

    expect(screen.getByText('Combo Barba & Cabelo VIP')).toBeInTheDocument();
    expect(screen.getByText(/Validade: 60 dias/i)).toBeInTheDocument();
    expect(
      screen.getByText('Pacote completo com 4 cortes e 4 barbas.')
    ).toBeInTheDocument();
    expect(screen.getByText(/180,00/)).toBeInTheDocument();
  });

  it('renders included services mapped from servicesMap', () => {
    render(
      <PackageCard
        pkg={mockPackage}
        servicesMap={servicesMap}
        onPurchase={vi.fn()}
      />
    );

    expect(screen.getByText('Corte Degrade')).toBeInTheDocument();
    expect(screen.getByText('Barba Terapia')).toBeInTheDocument();
    const quantities = screen.getAllByText('4x');
    expect(quantities).toHaveLength(2);
  });

  it('fires onPurchase callback with package id when clicked', async () => {
    const handlePurchase = vi.fn().mockResolvedValue(undefined);
    render(
      <PackageCard
        pkg={mockPackage}
        servicesMap={servicesMap}
        onPurchase={handlePurchase}
      />
    );

    const button = screen.getByRole('button', { name: /comprar pacote/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(handlePurchase).toHaveBeenCalledWith(1);
  });

  it('disables button when package is inactive', () => {
    const inactivePkg = { ...mockPackage, is_active: false };
    render(
      <PackageCard
        pkg={inactivePkg}
        servicesMap={servicesMap}
        onPurchase={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /pacote indisponível/i });
    expect(button).toBeDisabled();
  });
});

describe('WalletBalance Component', () => {
  const servicesMap: Record<number, string> = {
    1: 'Corte Moderno',
    2: 'Barba Alinhada',
  };

  const packagesMap: Record<number, string> = {
    101: 'Clube do Corte Trimestral',
  };

  it('renders empty state when customer has no packages', () => {
    const onBuyClick = vi.fn();
    render(
      <WalletBalance
        packages={[]}
        onBuyPackageClick={onBuyClick}
      />
    );

    expect(
      screen.getByText('Sua Carteira de Créditos está vazia')
    ).toBeInTheDocument();

    const exploreButton = screen.getByRole('button', {
      name: /explorar pacotes disponíveis/i,
    });
    fireEvent.click(exploreButton);
    expect(onBuyClick).toHaveBeenCalledTimes(1);
  });

  it('renders active customer package with remaining balances and progress bar', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const mockCustomerPackage: CustomerPackageResponse = {
      id: 55,
      customer_id: 12,
      package_id: 101,
      status: PackageStatus.ACTIVE,
      purchased_at: '2026-10-01T10:00:00Z',
      expires_at: futureDate.toISOString(),
      balances: [
        {
          id: 1,
          customer_package_id: 55,
          service_id: 1,
          total_quantity: 5,
          remaining_quantity: 3,
        },
      ],
    };

    render(
      <WalletBalance
        packages={[mockCustomerPackage]}
        packagesMap={packagesMap}
        servicesMap={servicesMap}
      />
    );

    expect(screen.getByText('Clube do Corte Trimestral')).toBeInTheDocument();
    expect(screen.getByText('Cód. #55')).toBeInTheDocument();
    expect(screen.getByText('Corte Moderno')).toBeInTheDocument();
    expect(screen.getByText('3 de 5 restantes')).toBeInTheDocument();
    expect(screen.getByText('60% disponível')).toBeInTheDocument();
  });

  it('shows warning alert when expiration is in 7 days or fewer', () => {
    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 4);

    const expiringPackage: CustomerPackageResponse = {
      id: 56,
      customer_id: 12,
      package_id: 101,
      status: PackageStatus.ACTIVE,
      purchased_at: '2026-10-01T10:00:00Z',
      expires_at: nearExpiryDate.toISOString(),
      balances: [
        {
          id: 2,
          customer_package_id: 56,
          service_id: 1,
          total_quantity: 2,
          remaining_quantity: 1,
        },
      ],
    };

    render(
      <WalletBalance
        packages={[expiringPackage]}
        packagesMap={packagesMap}
        servicesMap={servicesMap}
      />
    );

    expect(screen.getByText(/Atenção: seus créditos expiram em/i)).toBeInTheDocument();
  });

  it('fires onUseCreditClick when Agendar com crédito is clicked', () => {
    const handleUseCredit = vi.fn();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);

    const mockPackage: CustomerPackageResponse = {
      id: 77,
      customer_id: 12,
      package_id: 101,
      status: PackageStatus.ACTIVE,
      purchased_at: '2026-10-01T10:00:00Z',
      expires_at: futureDate.toISOString(),
      balances: [
        {
          id: 3,
          customer_package_id: 77,
          service_id: 2,
          total_quantity: 4,
          remaining_quantity: 2,
        },
      ],
    };

    render(
      <WalletBalance
        packages={[mockPackage]}
        packagesMap={packagesMap}
        servicesMap={servicesMap}
        onUseCreditClick={handleUseCredit}
      />
    );

    const useCreditBtn = screen.getByRole('button', {
      name: /agendar com crédito/i,
    });
    fireEvent.click(useCreditBtn);
    expect(handleUseCredit).toHaveBeenCalledWith(77, 2);
  });
});
