/**
 * SoftBarber Frontend - API Types & Interfaces
 * Synchronized with FastAPI Backend Schemas and Models
 */

// ==========================================
// Enums
// ==========================================

export enum PackageStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXHAUSTED = 'EXHAUSTED',
  CANCELLED = 'CANCELLED',
}

export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentType {
  PACKAGE_CREDIT = 'PACKAGE_CREDIT',
  AVULSO_LOCAL = 'AVULSO_LOCAL',
  AVULSO_ONLINE = 'AVULSO_ONLINE',
}

export enum LedgerTransactionType {
  PURCHASE = 'PURCHASE',
  DEBIT_BOOKING = 'DEBIT_BOOKING',
  REFUND_CANCELLATION = 'REFUND_CANCELLATION',
  EXPIRATION = 'EXPIRATION',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

// ==========================================
// Domain Models
// ==========================================

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number | string;
  is_active: boolean;
  created_at?: string;
}

export interface Professional {
  id: number;
  name: string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at?: string;
}

// ==========================================
// Package Schemas & DTOs
// ==========================================

export interface PackageItemResponse {
  id: number;
  service_id: number;
  quantity: number;
}

export interface PackageResponse {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  validity_days: number;
  is_active: boolean;
  items: PackageItemResponse[];
}

export interface PackagePurchaseRequest {
  customer_id: number;
  package_id: number;
  idempotency_key?: string | null;
}

export interface CustomerPackageBalanceResponse {
  id: number;
  customer_package_id: number;
  service_id: number;
  total_quantity: number;
  remaining_quantity: number;
}

export interface CustomerPackageResponse {
  id: number;
  customer_id: number;
  package_id: number;
  status: PackageStatus;
  purchased_at: string;
  expires_at: string;
  balances: CustomerPackageBalanceResponse[];
}

// ==========================================
// Schedule & Slot Schemas
// ==========================================

export interface AvailableSlot {
  start_time: string;
  end_time: string;
}

export interface AvailableSlotsResponse {
  professional_id: number;
  service_id: number;
  date: string;
  duration_minutes: number;
  slots: AvailableSlot[];
}

export interface GetAvailableSlotsParams {
  professionalId: number;
  serviceId: number;
  date: string;
}

// ==========================================
// Appointment Schemas & DTOs
// ==========================================

export interface BookWithCreditRequest {
  customer_package_id: number;
  service_id: number;
  professional_id: number;
  start_time: string;
  idempotency_key?: string | null;
}

export interface CancelAppointmentRequest {
  cancellation_reason?: string | null;
}

export interface AppointmentResponse {
  id: number;
  professional_id: number;
  customer_id: number;
  service_id: number;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  payment_type: PaymentType;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

// ==========================================
// Ledger Audit Schemas
// ==========================================

export interface CreditLedgerTransactionResponse {
  id: number;
  customer_package_id: number;
  service_id: number;
  appointment_id?: number | null;
  type: LedgerTransactionType;
  amount: number;
  balance_after: number;
  idempotency_key?: string | null;
  notes?: string | null;
  created_at: string;
}

// ==========================================
// Auth Schemas & DTOs
// ==========================================

export interface AdminLoginRequest {
  pin: string;
}

export interface AdminTokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  expires_in: number;
}

export interface ChangePinRequest {
  old_pin: string;
  new_pin: string;
}

export interface CustomerLoginRequest {
  phone: string;
  name?: string;
  email?: string;
}

export interface CustomerTokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  customer: Customer;
}

