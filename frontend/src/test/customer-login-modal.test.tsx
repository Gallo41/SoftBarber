import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerLoginModal } from '../components/auth/CustomerLoginModal';
import { ClientPortal } from '../pages/ClientPortal';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';
import * as packagesApi from '../api/packages';
import { Customer } from '../types/api';

vi.mock('../api/auth', () => ({
  adminLogin: vi.fn(),
  adminChangePin: vi.fn(),
  customerLogin: vi.fn(),
  getCurrentCustomer: vi.fn(),
}));

vi.mock('../api/packages', () => ({
  getCustomerPackages: vi.fn().mockResolvedValue([]),
  purchasePackage: vi.fn().mockResolvedValue({
    id: 999,
    customer_id: 42,
    package_id: 1,
    status: 'ACTIVE',
    purchased_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    balances: [],
  }),
}));

describe('CustomerLoginModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not render modal when isOpen is false', () => {
    render(
      <AuthProvider>
        <CustomerLoginModal isOpen={false} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.queryByText(/identificação do cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/11.*98765/i)).not.toBeInTheDocument();
  });

  it('renders form with phone, name, and email fields when isOpen is true', () => {
    render(
      <AuthProvider>
        <CustomerLoginModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText(/identifique-se/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone|whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar|identificar/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('formats Brazilian phone numbers as the user types (e.g. 11987654321)', () => {
    render(
      <AuthProvider>
        <CustomerLoginModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const phoneInput = screen.getByLabelText(/telefone|whatsapp/i) as HTMLInputElement;

    // Type raw digits
    fireEvent.change(phoneInput, { target: { value: '11987654321' } });

    // Should be formatted as (11) 98765-4321
    expect(phoneInput.value).toBe('(11) 98765-4321');
  });

  it('calls loginCustomer and invokes onSuccess and onClose on submit', async () => {
    const mockCustomer: Customer = {
      id: 42,
      name: 'João Barbeiro',
      phone: '(11) 98765-4321',
      email: 'joao@barbearia.com',
    };

    vi.mocked(authApi.customerLogin).mockResolvedValueOnce({
      access_token: 'cust-jwt-token',
      token_type: 'bearer',
      role: 'customer',
      customer: mockCustomer,
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <AuthProvider>
        <CustomerLoginModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </AuthProvider>
    );

    const phoneInput = screen.getByLabelText(/telefone|whatsapp/i);
    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitBtn = screen.getByRole('button', { name: /entrar|identificar/i });

    fireEvent.change(phoneInput, { target: { value: '11987654321' } });
    fireEvent.change(nameInput, { target: { value: 'João Barbeiro' } });
    fireEvent.change(emailInput, { target: { value: 'joao@barbearia.com' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.customerLogin).toHaveBeenCalledWith({
        phone: '(11) 98765-4321',
        name: 'João Barbeiro',
        email: 'joao@barbearia.com',
      });
    });

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(mockCustomer);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays API error message when customerLogin fails', async () => {
    vi.mocked(authApi.customerLogin).mockRejectedValueOnce({
      response: { data: { detail: 'Erro ao validar telefone do cliente.' } },
    });

    render(
      <AuthProvider>
        <CustomerLoginModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const phoneInput = screen.getByLabelText(/telefone|whatsapp/i);
    const submitBtn = screen.getByRole('button', { name: /entrar|identificar/i });

    fireEvent.change(phoneInput, { target: { value: '11987654321' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Erro ao validar telefone do cliente\./i)
      ).toBeInTheDocument();
    });
  });

  it('validates empty phone number before submission', async () => {
    render(
      <AuthProvider>
        <CustomerLoginModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /entrar|identificar/i });
    fireEvent.click(submitBtn);

    expect(authApi.customerLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/informe seu telefone/i);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <AuthProvider>
        <CustomerLoginModal isOpen={true} onClose={handleClose} />
      </AuthProvider>
    );

    const closeBtn = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('ClientPortal Customer Identification Banner and Reactive Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login invitation banner when customer is unauthenticated', () => {
    render(
      <AuthProvider>
        <ClientPortal activeTab="booking" onTabChange={vi.fn()} />
      </AuthProvider>
    );

    expect(
      screen.getByText(/identifique-se com seu whatsapp/i)
    ).toBeInTheDocument();

    const loginBtn = screen.getByRole('button', {
      name: /entrar|identificar/i,
    });
    expect(loginBtn).toBeInTheDocument();
  });

  it('opens CustomerLoginModal when clicking login button in invitation banner', () => {
    render(
      <AuthProvider>
        <ClientPortal activeTab="booking" onTabChange={vi.fn()} />
      </AuthProvider>
    );

    const loginBtn = screen.getByRole('button', {
      name: /entrar|identificar/i,
    });
    fireEvent.click(loginBtn);

    // Modal should now be open
    expect(screen.getByLabelText(/telefone|whatsapp/i)).toBeInTheDocument();
  });

  it('displays greeting banner with customer name, phone, and logout button when authenticated', () => {
    const mockCustomer: Customer = {
      id: 42,
      name: 'Carlos Oliveira',
      phone: '(11) 98765-4321',
      email: 'carlos@teste.com',
    };

    localStorage.setItem('softbarber_customer_token', 'mock-token');
    localStorage.setItem(
      'softbarber_customer_data',
      JSON.stringify(mockCustomer)
    );

    render(
      <AuthProvider>
        <ClientPortal activeTab="booking" onTabChange={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText(/olá, carlos oliveira!/i)).toBeInTheDocument();
    expect(screen.getByText(/\(11\) 98765-4321/)).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', {
      name: /trocar conta|sair/i,
    });
    expect(logoutBtn).toBeInTheDocument();

    // Clicking logout removes customer and displays unauthenticated banner again
    fireEvent.click(logoutBtn);
    expect(localStorage.getItem('softbarber_customer_token')).toBeNull();
    expect(
      screen.getByText(/identifique-se com seu whatsapp/i)
    ).toBeInTheDocument();
  });

  it('reactively synchronizes authenticated customer ID for packages and purchases', async () => {
    const mockCustomer: Customer = {
      id: 77,
      name: 'Mariana Souza',
      phone: '(11) 99887-7665',
    };

    localStorage.setItem('softbarber_customer_token', 'mock-token-77');
    localStorage.setItem(
      'softbarber_customer_data',
      JSON.stringify(mockCustomer)
    );

    render(
      <AuthProvider>
        <ClientPortal activeTab="packages" onTabChange={vi.fn()} />
      </AuthProvider>
    );

    // Should fetch customer packages for ID 77
    await waitFor(() => {
      expect(packagesApi.getCustomerPackages).toHaveBeenCalledWith(77);
    });

    // Clicking buy package should purchase for ID 77
    const buyBtns = screen.getAllByRole('button', { name: /comprar pacote/i });
    fireEvent.click(buyBtns[0]);

    await waitFor(() => {
      expect(packagesApi.purchasePackage).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 77,
        })
      );
    });
  });
});
