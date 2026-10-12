import apiClient from './client';
import {
  AvailableSlotsResponse,
  GetAvailableSlotsParams,
} from '../types/api';

/**
 * Retrieves available booking slots for a given professional, service, and date.
 * Supports both param object and positional arguments.
 */
export async function getAvailableSlots(
  params: GetAvailableSlotsParams
): Promise<AvailableSlotsResponse>;
export async function getAvailableSlots(
  professionalId: number,
  serviceId: number,
  date: string
): Promise<AvailableSlotsResponse>;
export async function getAvailableSlots(
  paramOrId: GetAvailableSlotsParams | number,
  serviceId?: number,
  date?: string
): Promise<AvailableSlotsResponse> {
  let profId: number;
  let sId: number;
  let d: string;

  if (typeof paramOrId === 'object') {
    profId = paramOrId.professionalId;
    sId = paramOrId.serviceId;
    d = paramOrId.date;
  } else {
    profId = paramOrId;
    sId = serviceId!;
    d = date!;
  }

  const response = await apiClient.get<AvailableSlotsResponse>(
    `/professionals/${profId}/available-slots`,
    {
      params: {
        service_id: sId,
        date: d,
      },
    }
  );
  return response.data;
}
