/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Mirrors the backend client-invoice DTOs. Times are ISO-8601 strings. */

export type ClientInvoiceStatus = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Void';

export interface ClientInvoice {
  clientInvoiceId: number;
  invoiceNumber: string;
  clientId: number;
  clientName?: string | null;
  payerId?: number | null;
  billToName: string;
  billToEmail?: string | null;
  periodFromUtc: string;
  periodToUtc: string;
  totalHours: number;
  amount: number;
  status: ClientInvoiceStatus;
  includesUnapproved: boolean;
  notes?: string | null;
  lineCount: number;
  createdByName?: string | null;
  createdOn: string;
  paidOn?: string | null;
  // Billing and AR fields (portal + legacy endpoints, ADR-0004).
  billToType?: 'Payer' | 'Client' | null;
  runId?: number | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  sentOn?: string | null;
  amountPaid?: number | null;
  amountAdjusted?: number | null;
  balance?: number | null;
  /** Portal: the client may pay this invoice online (Stripe Checkout). */
  canPayOnline?: boolean | null;
}

export interface ClientInvoiceLine {
  scheduleId: number;
  description: string;
  caregiverName?: string | null;
  serviceStartUtc: string;
  serviceEndUtc: string;
  hours: number;
  billRatePerHour: number;
  amount: number;
  isApproved: boolean;
  status?: string | null;
  lineType?: string | null;
  serviceDate?: string | null;
  procedureCode?: string | null;
  unitType?: string | null;
  units?: number | null;
  unitRate?: number | null;
  balance?: number | null;
}

export interface ClientInvoiceDetail {
  invoice: ClientInvoice;
  lines: ClientInvoiceLine[];
}

/** What an invoice for a client and period would contain, before it is created. */
export interface ClientInvoicePreview {
  clientId: number;
  fromUtc: string;
  toUtc: string;
  billToName: string;
  billToEmail?: string | null;
  lines: ClientInvoiceLine[];
  approvedCount: number;
  unapprovedCount: number;
  approvedHours: number;
  approvedAmount: number;
  totalHours: number;
  totalAmount: number;
  missingRateCount: number;
  canInvoiceUnapproved: boolean;
}

export interface CreateClientInvoiceRequest {
  clientId: number;
  fromUtc: string;
  toUtc: string;
  /** false bills approved schedules only. */
  includeUnapproved: boolean;
  notes?: string | null;
}
