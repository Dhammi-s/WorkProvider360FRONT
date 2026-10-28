/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Mirrors the backend payer entities / DTOs. Dates are ISO strings. */

export type PayerSourceType = 'Individual' | 'Company';

export type PayerType =
  | 'Private'
  | 'Insurance'
  | 'Medicaid'
  | 'Medicare'
  | 'VeteransAffairs'
  | 'Contract'
  | 'Hospital'
  | 'Facility'
  | 'Other';

export const PAYER_TYPES: { value: PayerType; label: string }[] = [
  { value: 'Private', label: 'Private (self-pay)' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Medicaid', label: 'Medicaid' },
  { value: 'Medicare', label: 'Medicare' },
  { value: 'VeteransAffairs', label: 'Veterans Affairs' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Facility', label: 'Facility' },
  { value: 'Other', label: 'Other' },
];

export function payerTypeLabel(t: string | null | undefined): string {
  return PAYER_TYPES.find((x) => x.value === t)?.label ?? t ?? '—';
}

/** How a payer pays its part of a client's bill. */
export type PaymentDistribution = 'Remainder' | 'Split' | 'PerDiem' | 'Visit' | 'Weekly' | 'Monthly';

export const PAYMENT_DISTRIBUTIONS: { value: PaymentDistribution; label: string; hint: string }[] = [
  { value: 'Remainder', label: 'Remainder', hint: 'Pays whatever is left after the other payers. Exactly one payer pays the remainder.' },
  { value: 'Split', label: 'Split (%)', hint: 'Pays a fixed percentage of the bill.' },
  { value: 'PerDiem', label: 'Per diem allowance', hint: 'Pays up to a fixed amount per day.' },
  { value: 'Visit', label: 'Per visit', hint: 'Pays up to a fixed amount per visit.' },
  { value: 'Weekly', label: 'Weekly', hint: 'Pays up to a fixed amount per week.' },
  { value: 'Monthly', label: 'Monthly', hint: 'Pays up to a fixed amount per month.' },
];

export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Subscriber relationship to the client (X12 relationship codes). */
export const SUBSCRIBER_RELATIONS: { value: string; label: string }[] = [
  { value: '01', label: 'Spouse' },
  { value: '19', label: 'Child' },
  { value: '20', label: 'Employee' },
  { value: '21', label: 'Unknown' },
  { value: '39', label: 'Organ donor' },
  { value: '53', label: 'Life partner' },
  { value: 'G8', label: 'Other relationship' },
];

/** Agency payer master record. */
export interface Payer {
  payerId: number;
  officeId: string | null;
  officeName: string | null;
  payerName: string;
  payerSourceType: PayerSourceType;
  payerType: PayerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  jobTitle: string | null;
  website: string | null;
  notes: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: 'Active' | 'Inactive' | string;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
  createdOn: string;
  updatedOn: string | null;
  linkedClientCount: number;
}

export interface PayerContact {
  contactId: number;
  payerId: number;
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
}

export interface PayerDetail {
  payer: Payer;
  contacts: PayerContact[];
}

export interface PayerLinkedClient {
  clientId: number;
  clientName: string;
  clientStatus: string;
  clientPayerId: number;
  rank: number | null;
  isActive: boolean;
  paymentDistribution: PaymentDistribution;
  paymentPercentage: number | null;
  paymentAmount: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  policyNumber: string | null;
  memberId: string | null;
}

export interface SavePayerRequest {
  officeId: string | null;
  payerSourceType: PayerSourceType;
  payerType: PayerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  jobTitle: string | null;
  website: string | null;
  notes: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
}

export interface SavePayerContactRequest {
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
}

/** A client's link to an agency payer, with the payer's main details. */
export interface ClientPayer {
  clientPayerId: number;
  clientId: number;
  payerId: number;
  officeId: string | null;
  payerName: string;
  payerSourceType: PayerSourceType;
  payerType: PayerType;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  /** Payer master status. */
  status: string;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
  isPrimary: boolean | null;
  isSecondary: boolean | null;
  /** 1 = primary; null while the link is inactive. */
  rank: number | null;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  policyNumber: string | null;
  memberId: string | null;
  groupName: string | null;
  groupNumber: string | null;
  isClientSubscriber: boolean;
  subscriberFirstName: string | null;
  subscriberLastName: string | null;
  subscriberRelation: string | null;
  subscriberDateOfBirth: string | null;
  subscriberGender: string | null;
  paymentDistribution: PaymentDistribution;
  paymentPercentage: number | null;
  paymentAmount: number | null;
  weekStartDay: number | null;
  monthStartDay: number | null;
  linkNotes: string | null;
}

/** Settings of a client's link to a payer (link and edit). */
export interface ClientPayerLinkRequest {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  policyNumber: string | null;
  memberId: string | null;
  groupName: string | null;
  groupNumber: string | null;
  isClientSubscriber: boolean;
  subscriberFirstName: string | null;
  subscriberLastName: string | null;
  subscriberRelation: string | null;
  subscriberDateOfBirth: string | null;
  subscriberGender: string | null;
  paymentDistribution: PaymentDistribution;
  paymentPercentage: number | null;
  paymentAmount: number | null;
  weekStartDay: number | null;
  monthStartDay: number | null;
  notes: string | null;
}

export interface LinkClientPayerRequest extends ClientPayerLinkRequest {
  payerId: number;
  /** Insert at this position (1 = primary); null adds it last. */
  rank: number | null;
}

export function rankLabel(rank: number | null | undefined): string {
  switch (rank) {
    case 1:
      return 'Primary';
    case 2:
      return 'Secondary';
    case 3:
      return 'Tertiary';
    case null:
    case undefined:
      return 'Inactive';
    default:
      return `#${rank}`;
  }
}

/** "Split 40%", "Per visit $50.00", "Remainder"... */
export function distributionLabel(p: {
  paymentDistribution: PaymentDistribution;
  paymentPercentage: number | null;
  paymentAmount: number | null;
  weekStartDay?: number | null;
  monthStartDay?: number | null;
}): string {
  const money = (n: number | null) => (n == null ? '' : ` $${n.toFixed(2)}`);
  switch (p.paymentDistribution) {
    case 'Split':
      return `Split ${p.paymentPercentage ?? 0}%`;
    case 'PerDiem':
      return `Per diem${money(p.paymentAmount)}`;
    case 'Visit':
      return `Per visit${money(p.paymentAmount)}`;
    case 'Weekly':
      return `Weekly${money(p.paymentAmount)}${p.weekStartDay != null ? ` (from ${WEEK_DAYS[p.weekStartDay]})` : ''}`;
    case 'Monthly':
      return `Monthly${money(p.paymentAmount)}${p.monthStartDay != null ? ` (from day ${p.monthStartDay})` : ''}`;
    default:
      return 'Remainder';
  }
}

/** Active link to an active payer whose dates cover the given day (yyyy-mm-dd). */
export function isPayerInEffect(p: ClientPayer, day: string): boolean {
  return (
    p.isActive &&
    (!p.status || p.status === 'Active') &&
    (!p.effectiveFrom || p.effectiveFrom.slice(0, 10) <= day) &&
    (!p.effectiveTo || p.effectiveTo.slice(0, 10) >= day)
  );
}

/** Bill / pay rates saved on the client itself (Billing & Invoice tab). */
export interface ClientBillingRates {
  clientId: number;
  billRatePerHour: number | null;
  payRatePerHour: number | null;
}

/**
 * The rates a new shift for the client should use, resolved in order:
 * client, payers in rank order, agency defaults.
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
