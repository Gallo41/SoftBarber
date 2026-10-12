import apiClient from './client';
import {
  AdminTokenResponse,
  ChangePinRequest,
  CustomerLoginRequest,
  CustomerTokenResponse,
  Customer,
} from '../types/api';

/**
 * Performs admin authentication using master PIN.
 * Returns JWT token with role=admin.
 */
export async function adminLogin(pin: string): Promise<AdminTokenResponse> {
  const response = await apiClient.post<AdminTokenResponse>('/auth/admin/login', {
    pin,
  });
  return response.data;
}

/**
 * Changes admin PIN validating existing PIN.
 */
export async function adminChangePin(
  oldPin: string,
  newPin: string
): Promise<{ message: string }> {
  const payload: ChangePinRequest = {
    old_pin: oldPin,
    new_pin: newPin,
  };
  const response = await apiClient.post<{ message: string }>(
    '/auth/admin/change-pin',
    payload
  );
  return response.data;
}

/**
 * Performs fast customer authentication or automatic onboarding by phone.
 */
export async function customerLogin(
  data: CustomerLoginRequest
): Promise<CustomerTokenResponse> {
  const response = await apiClient.post<CustomerTokenResponse>(
    '/auth/customer/login',
    data
  );
  return response.data;
}

/**
 * Retrieves profile of currently authenticated customer using JWT token.
 */
export async function getCurrentCustomer(): Promise<Customer> {
  const response = await apiClient.get<Customer>('/auth/customer/me');
  return response.data;
}
