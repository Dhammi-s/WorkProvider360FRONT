/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export type InvoiceType = 'Salary' | 'ShiftPay';
export type PaymentMethod = 'Cash' | 'Online';

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  recipientUserId?: number | null;
  recipientName: string;
  recipientEmail: string;
  recipientRoleName?: string | null;
  invoiceType: InvoiceType;
  amount: number;
  regularHours?: number | null;
  overtimeHours?: number | null;
  totalHours?: number | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  details?: string | null;
  status: string;
  paymentMethod: PaymentMethod;
  createdOn: string;
  paidOn?: string | null;
}

export interface PayInvoiceRequest {
  invoiceNumber: string;
  recipientUserId?: number | null;
  recipientName: string;
  recipientEmail: string;
  recipientRoleName?: string | null;
  invoiceType: InvoiceType;
  amount: number;
  regularHours?: number | null;
  overtimeHours?: number | null;
  totalHours?: number | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  details?: string | null;
  paymentMethod: PaymentMethod;
  pdfBase64: string;
  stripeSessionId?: string | null;
}

export interface CheckoutRequest {
  amount: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}
