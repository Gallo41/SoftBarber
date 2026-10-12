import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPinModal } from '../components/auth/AdminPinModal';
import { Header } from '../components/layout/Header';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';

vi.mock('../api/auth', () => ({
  adminLogin: vi.fn(),
  adminChangePin: vi.fn(),
  customerLogin: vi.fn(),
  getCurrentCustomer: vi.fn(),
}));

describe('AdminPinModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does not render anything when isOpen is false', () => {
    render(
      <AuthProvider>
        <AdminPinModal isOpen={false} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.queryByText(/acesso administrativo/i)).not.toBeInTheDocument();
  });

  it('renders modal title, numpad buttons (0-9, limpar, apagar) and 4 indicator dots', () => {
    render(
      <AuthProvider>
        <AdminPinModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText(/acesso administrativo/i)).toBeInTheDocument();

    // Check all digit buttons 0-9
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: new RegExp(`^${i}$`) })).toBeInTheDocument();
    }

    // Check action buttons
    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apagar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();

    // Check 4 pin indicators
    const dots = screen.getAllByTestId(/pin-dot-/);
    expect(dots).toHaveLength(4);
  });

  it('updates pin dots when clicking numpad digits, apagar and limpar', () => {
    render(
      <AuthProvider>
        <AdminPinModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const btn1 = screen.getByRole('button', { name: /^1$/ });
    const btn2 = screen.getByRole('button', { name: /^2$/ });
    const btn3 = screen.getByRole('button', { name: /^3$/ });
    const apagarBtn = screen.getByRole('button', { name: /apagar/i });
    const limparBtn = screen.getByRole('button', { name: /limpar/i });

    // Click 1, 2, 3
    fireEvent.click(btn1);
    fireEvent.click(btn2);
    fireEvent.click(btn3);

    // Should have 3 filled dots
    const dots = screen.getAllByTestId(/pin-dot-/);
    expect(dots[0].className).toContain('bg-amber-500');
    expect(dots[1].className).toContain('bg-amber-500');
    expect(dots[2].className).toContain('bg-amber-500');
    expect(dots[3].className).not.toContain('bg-amber-500');

    // Click apagar (backspace) -> 2 dots filled
    fireEvent.click(apagarBtn);
    expect(dots[0].className).toContain('bg-amber-500');
    expect(dots[1].className).toContain('bg-amber-500');
    expect(dots[2].className).not.toContain('bg-amber-500');

    // Click limpar -> 0 dots filled
    fireEvent.click(limparBtn);
    expect(dots[0].className).not.toContain('bg-amber-500');
    expect(dots[1].className).not.toContain('bg-amber-500');
  });

  it('supports typing with physical keyboard (digits, backspace, escape)', () => {
    const handleClose = vi.fn();
    render(
      <AuthProvider>
        <AdminPinModal isOpen={true} onClose={handleClose} />
      </AuthProvider>
    );

    // Type 5, 8
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '8' });

    const dots = screen.getAllByTestId(/pin-dot-/);
    expect(dots[0].className).toContain('bg-amber-500');
    expect(dots[1].className).toContain('bg-amber-500');
    expect(dots[2].className).not.toContain('bg-amber-500');

    // Press Backspace
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(dots[1].className).not.toContain('bg-amber-500');

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('submits pin automatically when 4 digits are entered and calls onSuccess on successful login', async () => {
    vi.mocked(authApi.adminLogin).mockResolvedValueOnce({
      access_token: 'fake-jwt-admin-token',
      token_type: 'bearer',
      role: 'admin',
      expires_in: 3600,
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <AuthProvider>
        <AdminPinModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /^1$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^2$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^3$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^4$/ }));

    await waitFor(() => {
      expect(authApi.adminLogin).toHaveBeenCalledWith('1234');
    });

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message, clears pin and allows retry when login fails', async () => {
    vi.mocked(authApi.adminLogin).mockRejectedValueOnce({
      response: { data: { detail: 'PIN de administrador incorreto.' } },
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <AuthProvider>
        <AdminPinModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      </AuthProvider>
    );

    // Type 9999
    fireEvent.click(screen.getByRole('button', { name: /^9$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^9$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^9$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^9$/ }));

    await waitFor(() => {
      expect(authApi.adminLogin).toHaveBeenCalledWith('9999');
    });

    await waitFor(() => {
      expect(screen.getByText(/PIN de administrador incorreto\./i)).toBeInTheDocument();
    });

    expect(handleSuccess).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();

    // Verify pin was cleared so user can try again
    const dots = screen.getAllByTestId(/pin-dot-/);
    expect(dots[0].className).not.toContain('bg-amber-500');
  });

  it('calls onClose when close button or cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <AuthProvider>
        <AdminPinModal isOpen={true} onClose={handleClose} />
      </AuthProvider>
    );

    const closeBtn = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('Header Integration with Admin Authentication & Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('opens AdminPinModal instead of switching mode when unauthenticated user clicks Painel', () => {
    const handleModeChange = vi.fn();

    render(
      <AuthProvider>
        <Header activeMode="client" onModeChange={handleModeChange} />
      </AuthProvider>
    );

    const adminBtn = screen.getByRole('button', { name: /painel da barbearia/i });
    fireEvent.click(adminBtn);

    // Should NOT call onModeChange directly
    expect(handleModeChange).not.toHaveBeenCalled();

    // Should display AdminPinModal
    expect(screen.getByText(/acesso administrativo/i)).toBeInTheDocument();
  });

  it('switches to admin mode after successful PIN login via modal triggered from Header', async () => {
    vi.mocked(authApi.adminLogin).mockResolvedValueOnce({
      access_token: 'valid-admin-token',
      token_type: 'bearer',
      role: 'admin',
      expires_in: 3600,
    });

    const handleModeChange = vi.fn();

    render(
      <AuthProvider>
        <Header activeMode="client" onModeChange={handleModeChange} />
      </AuthProvider>
    );

    const adminBtn = screen.getByRole('button', { name: /painel da barbearia/i });
    fireEvent.click(adminBtn);

    // Type PIN 1234
    fireEvent.click(screen.getByRole('button', { name: /^1$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^2$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^3$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^4$/ }));

    await waitFor(() => {
      expect(handleModeChange).toHaveBeenCalledWith('admin');
    });
  });

  it('switches directly to admin mode when already authenticated', () => {
    localStorage.setItem('softbarber_admin_token', 'existing-valid-token');
    const handleModeChange = vi.fn();

    render(
      <AuthProvider>
        <Header activeMode="client" onModeChange={handleModeChange} />
      </AuthProvider>
    );

    const adminBtn = screen.getByRole('button', { name: /painel da barbearia/i });
    fireEvent.click(adminBtn);

    // Directly switches mode without opening modal
    expect(handleModeChange).toHaveBeenCalledWith('admin');
    expect(screen.queryByText(/acesso administrativo/i)).not.toBeInTheDocument();
  });

  it('renders lock/logout button and admin badge when admin is logged in, and locks panel on click', () => {
    localStorage.setItem('softbarber_admin_token', 'existing-valid-token');
    const handleModeChange = vi.fn();

    render(
      <AuthProvider>
        <Header activeMode="admin" onModeChange={handleModeChange} />
      </AuthProvider>
    );

    // Check lock button and admin badge
    const lockBtn = screen.getByRole('button', { name: /bloquear painel/i });
    expect(lockBtn).toBeInTheDocument();
    expect(screen.getByTestId('admin-active-badge')).toBeInTheDocument();

    // Click lock button
    fireEvent.click(lockBtn);

    // Token should be removed from localStorage and mode switched back to client
    expect(localStorage.getItem('softbarber_admin_token')).toBeNull();
    expect(handleModeChange).toHaveBeenCalledWith('client');
  });
});
