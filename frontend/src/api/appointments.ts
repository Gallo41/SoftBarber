import apiClient from './client';
import {
  BookWithCreditRequest,
  CancelAppointmentRequest,
  AppointmentResponse,
} from '../types/api';

/**
 * Books an appointment deducting 1 package credit in an atomic transaction.
 * Supports idempotency key to prevent double bookings.
 */
export async function bookWithCredit(
  data: BookWithCreditRequest,
  idempotencyKey?: string
): Promise<AppointmentResponse> {
  const finalKey = idempotencyKey || data.idempotency_key;
  const payload: BookWithCreditRequest = {
    ...data,
    idempotency_key: finalKey,
  };

  const headers: Record<string, string> = {};
  if (finalKey) {
    headers['Idempotency-Key'] = finalKey;
  }

  const response = await apiClient.post<AppointmentResponse>(
    '/appointments/book-with-credit',
    payload,
    { headers }
  );
  return response.data;
}

/**
 * Cancels an appointment. If canceled with >= 2h notice, the backend
 * automatically refunds the credit to the customer package.
 */
export async function cancelAppointment(
  appointmentId: number,
  data?: CancelAppointmentRequest
): Promise<AppointmentResponse> {
  const response = await apiClient.post<AppointmentResponse>(
    `/appointments/${appointmentId}/cancel`,
    data ?? {}
  );
  return response.data;
}

/**
 * Retrieves all appointments for a customer.
 */
export async function getCustomerAppointments(
  customerId: number
): Promise<AppointmentResponse[]> {
  const response = await apiClient.get<AppointmentResponse[]>(
    `/customers/${customerId}/appointments`
  );
  return response.data;
}

