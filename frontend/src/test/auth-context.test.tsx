import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
import { apiClient } from '../api/client';
import { Customer } from '../types/api';

vi.mock('../api/auth', () => ({
  adminLogin: vi.fn(),
  adminChangePin: vi.fn(),
  customerLogin: vi.fn(),
  getCurrentCustomer: vi.fn(),
}));

const TestConsumer: React.FC = () => {
  const {
    isAdminAuthenticated,
    adminToken,
    currentCustomer,
    customerToken,
  } = useAuth();

  return (
    <div>
      <div data-testid="admin-auth">{isAdminAuthenticated ? 'ADMIN_AUTHENTICATED' : 'ADMIN_UNAUTHENTICATED'}</div>
      <div data-testid="admin-token">{adminToken || 'NO_ADMIN_TOKEN'}</div>
      <div data-testid="customer-auth">{customerToken ? 'CUSTOMER_AUTHENTICATED' : 'CUSTOMER_UNAUTHENTICATED'}</div>
      <div data-testid="customer-token">{customerToken || 'NO_CUSTOMER_TOKEN'}</div>
      <div data-testid="customer-name">{currentCustomer?.name || 'NO_CUSTOMER_NAME'}</div>
      <div data-testid="customer-phone">{currentCustomer?.phone || 'NO_CUSTOMER_PHONE'}</div>
    </div>
  );
};

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('throws an error when useAuth is used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });

  it('provides default unauthenticated state when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAdminAuthenticated).toBe(false);
    expect(result.current.adminToken).toBeNull();
    expect(result.current.customerToken).toBeNull();
    expect(result.current.currentCustomer).toBeNull();
  });

  it('hydrates admin and customer session from localStorage on initial render', () => {
    const mockCustomer: Customer = {
      id: 42,
      name: 'Maria Souza',
      phone: '11988887777',
      email: 'maria@exemplo.com',
    };

    localStorage.setItem('softbarber_admin_token', 'stored-admin-jwt');
    localStorage.setItem('softbarber_customer_token', 'stored-customer-jwt');
    localStorage.setItem('softbarber_customer_data', JSON.stringify(mockCustomer));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAdminAuthenticated).toBe(true);
    expect(result.current.adminToken).toBe('stored-admin-jwt');
    expect(result.current.customerToken).toBe('stored-customer-jwt');
    expect(result.current.currentCustomer).toEqual(mockCustomer);
  });

  it('handles corrupted customer JSON in localStorage gracefully without throwing', () => {
    localStorage.setItem('softbarber_customer_data', 'invalid-json{');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.currentCustomer).toBeNull();
  });

  it('authenticates admin successfully and persists token', async () => {
    vi.mocked(authApi.adminLogin).mockResolvedValueOnce({
      access_token: 'new-admin-token-123',
      token_type: 'bearer',
      role: 'admin',
      expires_in: 28800,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAdminAuthenticated).toBe(false);

    let loginRes;
    await act(async () => {
      loginRes = await result.current.loginAdmin('1234');
    });

    expect(authApi.adminLogin).toHaveBeenCalledWith('1234');
    expect(loginRes).toEqual({
      access_token: 'new-admin-token-123',
      token_type: 'bearer',
      role: 'admin',
      expires_in: 28800,
    });
    expect(result.current.isAdminAuthenticated).toBe(true);
    expect(result.current.adminToken).toBe('new-admin-token-123');
    expect(localStorage.getItem('softbarber_admin_token')).toBe('new-admin-token-123');
  });

  it('handles admin login failure without modifying state', async () => {
    vi.mocked(authApi.adminLogin).mockRejectedValueOnce(new Error('Invalid PIN'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await expect(result.current.loginAdmin('wrong-pin')).rejects.toThrow('Invalid PIN');

    expect(result.current.isAdminAuthenticated).toBe(false);
    expect(result.current.adminToken).toBeNull();
    expect(localStorage.getItem('softbarber_admin_token')).toBeNull();
  });

  it('logs out admin and removes token from localStorage', async () => {
    localStorage.setItem('softbarber_admin_token', 'admin-token-to-remove');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAdminAuthenticated).toBe(true);

    act(() => {
      result.current.logoutAdmin();
    });

    expect(result.current.isAdminAuthenticated).toBe(false);
    expect(result.current.adminToken).toBeNull();
    expect(localStorage.getItem('softbarber_admin_token')).toBeNull();
  });

  it('calls changeAdminPin via API', async () => {
    vi.mocked(authApi.adminChangePin).mockResolvedValueOnce({
      message: 'PIN alterado com sucesso',
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let response;
    await act(async () => {
      response = await result.current.changeAdminPin('1234', '5678');
    });

    expect(authApi.adminChangePin).toHaveBeenCalledWith('1234', '5678');
    expect(response).toEqual({ message: 'PIN alterado com sucesso' });
  });

  it('authenticates customer and persists token and customer profile', async () => {
    const mockCustomer: Customer = {
      id: 99,
      name: 'Cliente Teste',
      phone: '11999998888',
      email: 'cliente@teste.com',
    };

    vi.mocked(authApi.customerLogin).mockResolvedValueOnce({
      access_token: 'cust-token-abc',
      token_type: 'bearer',
      role: 'customer',
      customer: mockCustomer,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.customerToken).toBeNull();

    await act(async () => {
      await result.current.loginCustomer('11999998888', 'Cliente Teste', 'cliente@teste.com');
    });

    expect(authApi.customerLogin).toHaveBeenCalledWith({
      phone: '11999998888',
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
    });
    expect(result.current.customerToken).toBe('cust-token-abc');
    expect(result.current.currentCustomer).toEqual(mockCustomer);

    expect(localStorage.getItem('softbarber_customer_token')).toBe('cust-token-abc');
    expect(JSON.parse(localStorage.getItem('softbarber_customer_data') || '{}')).toEqual(mockCustomer);
  });

  it('logs out customer and clears stored customer data and token', async () => {
    const mockCustomer: Customer = {
      id: 99,
      name: 'Cliente Teste',
      phone: '11999998888',
    };
    localStorage.setItem('softbarber_customer_token', 'cust-token-abc');
    localStorage.setItem('softbarber_customer_data', JSON.stringify(mockCustomer));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.customerToken).toBe('cust-token-abc');
    expect(result.current.currentCustomer).toEqual(mockCustomer);

    act(() => {
      result.current.logoutCustomer();
    });

    expect(result.current.customerToken).toBeNull();
    expect(result.current.currentCustomer).toBeNull();
    expect(localStorage.getItem('softbarber_customer_token')).toBeNull();
    expect(localStorage.getItem('softbarber_customer_data')).toBeNull();
  });
});

describe('Axios Client Authorization Interceptor', () => {
  const getInterceptorHandler = () => {
    const requestInterceptors = (apiClient.interceptors.request as any).handlers;
    return requestInterceptors[0]?.fulfilled;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('attaches admin token to request headers if present', async () => {
    localStorage.setItem('softbarber_admin_token', 'admin-token-xyz');

    const handler = getInterceptorHandler();
    const config = await handler({
      headers: {} as any,
    });

    expect(config.headers.Authorization).toBe('Bearer admin-token-xyz');
  });

  it('attaches customer token if admin token is absent', async () => {
    localStorage.setItem('softbarber_customer_token', 'customer-token-123');

    const handler = getInterceptorHandler();
    const config = await handler({
      headers: {} as any,
    });

    expect(config.headers.Authorization).toBe('Bearer customer-token-123');
  });

  it('prefers admin token when both are present', async () => {
    localStorage.setItem('softbarber_admin_token', 'admin-token-xyz');
    localStorage.setItem('softbarber_customer_token', 'customer-token-123');

    const handler = getInterceptorHandler();
    const config = await handler({
      headers: {} as any,
    });

    expect(config.headers.Authorization).toBe('Bearer admin-token-xyz');
  });

  it('leaves Authorization undefined if no token in localStorage', async () => {
    const handler = getInterceptorHandler();
    const config = await handler({
      headers: {} as any,
    });

    expect(config.headers.Authorization).toBeUndefined();
  });
});
