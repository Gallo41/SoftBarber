import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  AdminTokenResponse,
  CustomerTokenResponse,
  Customer,
} from '../types/api';
import {
  adminLogin,
  adminChangePin,
  customerLogin,
} from '../api/auth';

export const ADMIN_TOKEN_KEY = 'softbarber_admin_token';
export const CUSTOMER_TOKEN_KEY = 'softbarber_customer_token';
export const CUSTOMER_DATA_KEY = 'softbarber_customer_data';

export interface AuthContextType {
  isAdminAuthenticated: boolean;
  adminToken: string | null;
  customerToken: string | null;
  currentCustomer: Customer | null;
  loginAdmin: (pin: string) => Promise<AdminTokenResponse>;
  logoutAdmin: () => void;
  changeAdminPin: (oldPin: string, newPin: string) => Promise<{ message: string }>;
  loginCustomer: (
    phone: string,
    name?: string,
    email?: string
  ) => Promise<CustomerTokenResponse>;
  logoutCustomer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  });

  const [customerToken, setCustomerToken] = useState<string | null>(() => {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  });

  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    const raw = localStorage.getItem(CUSTOMER_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Customer;
    } catch {
      return null;
    }
  });

  const isAdminAuthenticated = !!adminToken;

  const handleLoginAdmin = useCallback(async (pin: string) => {
    const response = await adminLogin(pin);
    localStorage.setItem(ADMIN_TOKEN_KEY, response.access_token);
    setAdminToken(response.access_token);
    return response;
  }, []);

  const handleLogoutAdmin = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
  }, []);

  const handleChangeAdminPin = useCallback(
    async (oldPin: string, newPin: string) => {
      return await adminChangePin(oldPin, newPin);
    },
    []
  );

  const handleLoginCustomer = useCallback(
    async (phone: string, name?: string, email?: string) => {
      const response = await customerLogin({ phone, name, email });
      localStorage.setItem(CUSTOMER_TOKEN_KEY, response.access_token);
      localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(response.customer));
      setCustomerToken(response.access_token);
      setCurrentCustomer(response.customer);
      return response;
    },
    []
  );

  const handleLogoutCustomer = useCallback(() => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_DATA_KEY);
    setCustomerToken(null);
    setCurrentCustomer(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      isAdminAuthenticated,
      adminToken,
      customerToken,
      currentCustomer,
      loginAdmin: handleLoginAdmin,
      logoutAdmin: handleLogoutAdmin,
      changeAdminPin: handleChangeAdminPin,
      loginCustomer: handleLoginCustomer,
      logoutCustomer: handleLogoutCustomer,
    }),
    [
      isAdminAuthenticated,
      adminToken,
      customerToken,
      currentCustomer,
      handleLoginAdmin,
      handleLogoutAdmin,
      handleChangeAdminPin,
      handleLoginCustomer,
      handleLogoutCustomer,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
