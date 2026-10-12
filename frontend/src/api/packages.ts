import apiClient from './client';
import {
  PackagePurchaseRequest,
  CustomerPackageResponse,
} from '../types/api';

/**
 * Purchases a package for a customer and initializes credit balances.
 * Supports optional idempotency key in payload or headers.
 */
export async function purchasePackage(
  data: PackagePurchaseRequest,
  idempotencyKey?: string
): Promise<CustomerPackageResponse> {
  const finalKey = idempotencyKey || data.idempotency_key;
  const payload: PackagePurchaseRequest = {
    ...data,
    idempotency_key: finalKey,
  };

  const headers: Record<string, string> = {};
  if (finalKey) {
    headers['Idempotency-Key'] = finalKey;
  }

  const response = await apiClient.post<CustomerPackageResponse>(
    '/packages/purchase',
    payload,
    { headers }
  );
  return response.data;
}

/**
 * Retrieves all packages and current active/expired balances for a given customer.
 */
export async function getCustomerPackages(
  customerId: number
): Promise<CustomerPackageResponse[]> {
  const response = await apiClient.get<CustomerPackageResponse[]>(
    `/customers/${customerId}/packages`
  );
  return response.data;
}
