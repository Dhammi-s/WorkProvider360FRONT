
export interface ClientPayer {
  clientPayerId?: number | null;
  clientId?: number | null;
  payerId: number;
  officeId: string;
  payerName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: string;
  createdOn: string;
  updatedOn: string | null;
  isPrimary: boolean | null;
  isSecondary: boolean | null;
  /** Payer-level rates; null = not set (resolution moves on to the next payer). */
  billRatePerHour: number | null;
  payRatePerHour: number | null;
}

/** Body for add-payer / update-payer. payerId is 0 when adding. */
export interface UpsertClientPayerRequest {
  payerId: number;
  payerName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: string;
  isPrimary: boolean;
  isSecondary: boolean;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
}

export type PayerRank = 'Primary' | 'Secondary' | 'Other';

export function payerRank(p: Pick<ClientPayer, 'isPrimary' | 'isSecondary'>): PayerRank {
  return p.isPrimary ? 'Primary' : p.isSecondary ? 'Secondary' : 'Other';
}

/** Bill / pay rates saved on the client itself (Billing & Invoice tab). */
export interface ClientBillingRates {
  clientId: number;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
}

/**
 * The rates a new shift for the client should use, resolved in order:
 * client, primary payer, secondary payer, other payers, agency defaults.
 */
export interface ResolvedRates {
  clientId: number;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
  billRateSource: string | null;
  payRateSource: string | null;
  isBillRateMissing: boolean;
  isPayRateMissing: boolean;
  hasConflict: boolean;
}

export interface ClientPayersResponse {
  success: boolean;
  message: string | null;
  data: ClientPayer[] | null;
  errors: unknown;
}
