/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export interface PosTransaction {
  posTransactionId: string;
  payerName: string;
  payerEmail?: string | null;
  description?: string | null;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  cardLast4?: string | null;
  status: 'Approved' | 'Declined';
  declineReason?: string | null;
  provider: string;
  createdOn: string;
}

export interface PosChargeRequest {
  payerName: string;
  payerEmail?: string | null;
  description?: string | null;
  amount: number;
  cardNumber: string;
}

export interface PosFeeSettings {
  feePercent: number;
  feeFixed: number;
  updatedOn: string;
}

export interface PosSummary {
  approvedCount: number;
  declinedCount: number;
  totalGross: number;
  totalPlatformFees: number;
  totalNet: number;
}
