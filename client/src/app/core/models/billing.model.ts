/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Billing & revenue cycle (ADR-0003/0004): access, invoices, invoice runs, statements,
 * payments / AR and Settings ▸ Billing. Mirrors the "API contract (for the frontend)"
 * of docs/lld/billing-rcm-lld.md. Date-only fields are sent as 'yyyy-MM-dd' and come
 * back as 'yyyy-MM-ddT00:00:00' — always handle them as strings (see dateOnly()).
 */

// ------------------------------------------------------------------ Common

export type BillingAccessLevel = 'None' | 'Read' | 'Write';

export interface BillingAccess {
  roleName: string;
  accessLevel: BillingAccessLevel;
  canView: boolean;
  canManage: boolean;
  canManageSettings: boolean;
  writeOffApprovalThreshold: number;
}

/** Paged list with totals (invoices: amount / open balance; payments: amount / unapplied; claims: total charge). */
export interface BillingPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalAmount: number;
  totalBalance: number;
  pendingCount: number;
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Void';
export type BillToType = 'Payer' | 'Client';
export type UnitType = 'Hour' | 'Minutes15' | 'Minutes30' | 'Visit' | 'Day';
export type RoundingRule = 'None' | 'Nearest' | 'Up' | 'Down';
export type ClaimFormat = 'Invoice' | 'Claim837P' | 'None';
export type InvoiceLineType = 'Service' | 'PatientResponsibility' | 'Adjustment';

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Issued', label: 'Issued' },
  { value: 'PartiallyPaid', label: 'Partially paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Void', label: 'Void' },
];

export const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'Hour', label: 'Hour' },
  { value: 'Minutes15', label: '15 minutes' },
  { value: 'Minutes30', label: '30 minutes' },
  { value: 'Visit', label: 'Visit' },
  { value: 'Day', label: 'Day' },
];

export const ROUNDING_RULES: { value: RoundingRule; label: string; hint: string }[] = [
  { value: 'None', label: 'None', hint: 'Exact minutes' },
  { value: 'Nearest', label: 'Nearest (8-minute rule)', hint: 'Round to the nearest unit' },
  { value: 'Up', label: 'Up', hint: 'Any part of a unit bills a full unit' },
  { value: 'Down', label: 'Down', hint: 'Only complete units are billed' },
];

export const CLAIM_FORMATS: { value: ClaimFormat; label: string }[] = [
  { value: 'Invoice', label: 'Invoice (paper / PDF)' },
  { value: 'Claim837P', label: 'Electronic claim (837P)' },
  { value: 'None', label: 'Do not bill' },
];

// ------------------------------------------------------------------ Invoices

export interface InvoiceListRow {
  clientInvoiceId: number;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  clientId: number;
  clientName: string | null;
  clientOfficeId: string | null;
  billToType: BillToType;
  payerId: number | null;
  payerName: string | null;
  payerType: string | null;
  claimFormat: ClaimFormat | null;
  clientPayerId: number | null;
  billToName: string | null;
  billToEmail: string | null;
  runId: number | null;
  periodFromUtc: string;
  /** Exclusive end. */
  periodToUtc: string;
  invoiceDate: string | null;
  dueDate: string | null;
  totalHours: number;
  amount: number;
  amountPaid: number;
  amountAdjusted: number;
  balance: number;
  includesUnapproved: boolean;
  notes: string | null;
  sentOn: string | null;
  paidOn: string | null;
  voidReason: string | null;
  voidedOn: string | null;
  replacesInvoiceId: number | null;
  finalizedOn: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  createdOn: string;
  lineCount: number;
}

export interface InvoiceHeader extends InvoiceListRow {
  billToAddress1: string | null;
  billToAddress2: string | null;
  billToCity: string | null;
  billToState: string | null;
  billToPostalCode: string | null;
  clientAddress1: string | null;
  clientAddress2: string | null;
  clientCity: string | null;
  clientState: string | null;
  clientPostalCode: string | null;
  memberId: string | null;
  policyNumber: string | null;
  voidedByUserId: number | null;
  voidedByName: string | null;
  replacesInvoiceNumber: string | null;
  finalizedByUserId: number | null;
  finalizedByName: string | null;
  updatedOn: string | null;
}

export interface InvoiceLine {
  lineId: number;
  clientInvoiceId: number;
  lineType: InvoiceLineType;
  scheduleId: number | null;
  allocationId: number | null;
  sourceAllocationId: number | null;
  payerId: number | null;
  serviceTypeId: number | null;
  serviceTypeName: string | null;
  billingCodeId: number | null;
  serviceDate: string | null;
  description: string | null;
  caregiverName: string | null;
  serviceStartUtc: string | null;
  serviceEndUtc: string | null;
  minutes: number | null;
  hours: number;
  billRatePerHour: number;
  procedureCode: string | null;
  modifier1: string | null;
  modifier2: string | null;
  modifier3: string | null;
  modifier4: string | null;
  revenueCode: string | null;
  placeOfService: string | null;
  unitType: UnitType | null;
  units: number | null;
  unitRate: number | null;
  amount: number;
  amountPaid: number;
  amountAdjusted: number;
  balance: number;
  isApproved: boolean;
  authorizationId: number | null;
  authorizationNumber: string | null;
  sourceAdjustmentId: number | null;
  sourceLineId: number | null;
}

export interface InvoiceApplication {
  applicationId: number;
  paymentId: number;
  invoiceId: number;
  invoiceLineId: number | null;
  amount: number;
  isReversed: boolean;
  reversedOn: string | null;
  createdOn: string;
  method: string;
  reference: string | null;
  receivedOn: string;
  source: string;
  sourceType: string;
  paymentStatus: string;
}

export type AdjustmentType =
  | 'WriteOff'
  | 'Contractual'
  | 'Discount'
  | 'PatientResponsibility'
  | 'Credit'
  | 'Debit'
  | 'Other';

export const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; hint: string }[] = [
  { value: 'WriteOff', label: 'Write-off', hint: 'Uncollectable amount' },
  { value: 'Contractual', label: 'Contractual', hint: 'Payer contract reduction' },
  { value: 'Discount', label: 'Discount', hint: 'Courtesy discount' },
  { value: 'PatientResponsibility', label: 'Patient responsibility', hint: 'Moved to the client' },
  { value: 'Credit', label: 'Credit', hint: 'Reduces the balance' },
  { value: 'Debit', label: 'Debit', hint: 'Increases the balance (enter a negative amount)' },
  { value: 'Other', label: 'Other', hint: '' },
];

export interface InvoiceAdjustment {
  adjustmentId: number;
  invoiceId: number;
  invoiceLineId: number | null;
  adjustmentType: AdjustmentType;
  amount: number;
  groupCode: string | null;
  reasonCode: string | null;
  reasonDescription: string | null;
  remittanceAdjustmentId: number | null;
  note: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  createdOn: string;
  isReversed: boolean;
  reversedByUserId: number | null;
  reversedOn: string | null;
}

export interface InvoiceClaimRef {
  claimId: number;
  claimNumber: string;
  status: string;
  frequencyCode: string;
  totalCharge: number;
  paidAmount: number;
  submittedOn: string | null;
  lastStatusOn: string | null;
}

export interface InvoiceDetail {
  invoice: InvoiceHeader;
  lines: InvoiceLine[];
  applications: InvoiceApplication[];
  adjustments: InvoiceAdjustment[];
  claims: InvoiceClaimRef[];
}

export interface InvoiceListQuery {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus | '';
  clientId?: number | null;
  payerId?: number | null;
  billToType?: BillToType | '';
  runId?: number | null;
  officeId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  onlyOpen?: boolean;
  overdueAsOf?: string | null;
  search?: string | null;
}

export interface FinalizedInvoice {
  clientInvoiceId: number;
  invoiceNumber: string;
  clientId: number;
  billToType: BillToType;
  payerId: number | null;
  claimFormat: ClaimFormat | null;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  balance: number;
  status: InvoiceStatus;
  runId: number | null;
}

export interface FinalizeResult {
  invoices: FinalizedInvoice[];
  claimsCreated: number;
  warnings: string[];
}

export interface InvoiceVoided {
  clientInvoiceId: number;
  clientId: number;
  status: InvoiceStatus;
  voidedClaimCount: number;
  openClaimCount: number;
}

export interface InvoiceDraftDeleted {
  clientInvoiceId: number;
  clientId: number;
  runId: number | null;
}

export interface InvoiceLineRemoved {
  clientInvoiceId: number;
  clientId: number;
  runId: number | null;
  invoiceDeleted: boolean;
  lineCount: number;
  totalHours: number;
  amount: number;
}

export interface InvoiceSendResult {
  invoiceId: number;
  sentOn: string;
  toEmail: string;
  payLinkIncluded: boolean;
}

export interface CreateAdjustmentRequest {
  invoiceLineId: number | null;
  adjustmentType: AdjustmentType;
  /** Positive reduces the balance; Debit negative. */
  amount: number;
  groupCode: string | null;
  reasonCode: string | null;
  note: string | null;
}

export interface AdjustmentResult {
  adjustmentId: number;
  invoiceId: number;
  balance: number;
  status: InvoiceStatus;
}

// ------------------------------------------------------------------ Invoice runs

export interface InvoiceRunRequest {
  from: string;
  to: string;
  officeId: string | null;
  clientId: number | null;
  payerId: number | null;
  payerType: string | null;
  billToType: BillToType | null;
  includeUnapproved: boolean;
  notes: string | null;
  excludeLineKeys: string[];
}

export interface InvoiceRunPreviewLine {
  key: string;
  rowType: 'Share' | 'LegacyVisit';
  scheduleId: number | null;
  allocationId: number | null;
  serviceTypeId: number | null;
  serviceTypeName: string | null;
  serviceDate: string | null;
  description: string | null;
  caregiverName: string | null;
  startUtc: string | null;
  endUtc: string | null;
  minutes: number;
  billedMinutes: number;
  hours: number;
  billRatePerHour: number;
  billingCodeId: number | null;
  procedureCode: string | null;
  modifiers: string[];
  revenueCode: string | null;
  placeOfService: string | null;
  unitType: UnitType | null;
  units: number;
  unitRate: number;
  amount: number;
  isApproved: boolean;
  authorizationId: number | null;
  authorizationNumber: string | null;
  error: string | null;
  warnings: string[];
}

export interface InvoiceRunPreviewGroup {
  key: string;
  clientId: number;
  clientName: string;
  clientOfficeId: string | null;
  billToType: BillToType;
  payerId: number | null;
  payerName: string | null;
  payerType: string | null;
  claimFormat: ClaimFormat | null;
  clientPayerId: number | null;
  billToName: string;
  billToEmail: string | null;
  lineCount: number;
  totalHours: number;
  totalAmount: number;
  errorCount: number;
  lines: InvoiceRunPreviewLine[];
}

export interface InvoiceRunPreview {
  from: string;
  to: string;
  invoiceCount: number;
  lineCount: number;
  totalAmount: number;
  errorCount: number;
  unapprovedCount: number;
  canInvoiceUnapproved: boolean;
  groups: InvoiceRunPreviewGroup[];
}

export interface InvoiceRunCreated {
  runId: number;
  invoiceCount: number;
  totalAmount: number;
  skippedLineCount: number;
  warnings: string[];
}

export type InvoiceRunStatus = 'Draft' | 'Finalized' | 'Discarded';

export interface InvoiceRun {
  runId: number;
  fromDate: string;
  toDate: string;
  officeId: string | null;
  officeName: string | null;
  clientId: number | null;
  clientName: string | null;
  payerId: number | null;
  payerName: string | null;
  payerType: string | null;
  billToType: BillToType | null;
  includeUnapproved: boolean;
  status: InvoiceRunStatus;
  invoiceCount: number;
  totalAmount: number;
  notes: string | null;
  draftCount: number;
  createdByUserId: number | null;
  createdByName: string | null;
  createdOn: string;
  finalizedOn: string | null;
  discardedOn: string | null;
}

export interface InvoiceRunDetail {
  run: InvoiceRun;
  invoices: InvoiceListRow[];
}

export interface InvoiceRunDiscard {
  runId: number;
  status: InvoiceRunStatus;
  deletedInvoiceCount: number;
  clientIdsJson: string | null;
}

// ------------------------------------------------------------------ Statements

export type AgingBucket = 'Current' | '1-30' | '31-60' | '61-90' | '90+';

export interface AgingAmounts {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  total: number;
  invoiceCount: number;
}

export interface StatementParty {
  partyType: BillToType;
  payerId: number | null;
  clientId: number | null;
  partyName: string;
  email: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  asOf: string;
}

export interface StatementInvoice {
  clientInvoiceId: number;
  invoiceNumber: string | null;
  clientId: number;
  clientName: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  periodFromUtc: string;
  periodToUtc: string;
  amount: number;
  amountPaid: number;
  amountAdjusted: number;
  balance: number;
  status: InvoiceStatus;
  daysPastDue: number;
  agingBucket: AgingBucket;
}

export interface StatementPayment {
  paymentId: number;
  receivedOn: string;
  method: string;
  reference: string | null;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  source: string;
}

export interface Statement {
  party: StatementParty;
  invoices: StatementInvoice[];
  payments: StatementPayment[];
  aging: AgingAmounts;
}

export interface StatementQuery {
  clientId?: number | null;
  payerId?: number | null;
  asOf?: string | null;
}

// ------------------------------------------------------------------ Payments & AR

export type PaymentSourceType = 'Payer' | 'Client';
export type PaymentMethod = 'Check' | 'EFT' | 'ACH' | 'Card' | 'Cash' | 'ERA' | 'Online' | 'Legacy' | 'Other';
export type PaymentStatus = 'Posted' | 'Reversed';
export type PaymentSource = 'Manual' | 'ERA' | 'Stripe' | 'Backfill';

/** Methods a user may pick when recording a payment by hand. */
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ['Check', 'EFT', 'ACH', 'Card', 'Cash', 'Other'];
/** Methods a refund may use. */
export const REFUND_METHODS: PaymentMethod[] = ['Check', 'EFT', 'ACH', 'Card', 'Cash', 'Online', 'Other'];

export interface PaymentListRow {
  paymentId: number;
  sourceType: PaymentSourceType;
  payerId: number | null;
  payerName: string | null;
  clientId: number | null;
  clientName: string | null;
  method: PaymentMethod;
  reference: string | null;
  externalReference: string | null;
  receivedOn: string;
  amount: number;
  appliedAmount: number;
  refundedAmount: number;
  unappliedAmount: number;
  status: PaymentStatus;
  source: PaymentSource;
  remittanceId: number | null;
  note: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  createdOn: string;
  reversedOn: string | null;
  applicationCount: number;
}

export interface PaymentHeader extends Omit<PaymentListRow, 'applicationCount'> {
  clientOfficeId: string | null;
  remittanceTraceNumber: string | null;
  reversedByUserId: number | null;
  reversedByName: string | null;
  reversalReason: string | null;
}

export interface PaymentApplicationRow {
  applicationId: number;
  paymentId: number;
  invoiceId: number;
  invoiceNumber: string | null;
  clientId: number;
  clientName: string | null;
  billToName: string | null;
  invoiceLineId: number | null;
  lineServiceDate: string | null;
  lineProcedureCode: string | null;
  amount: number;
  isReversed: boolean;
  reversedOn: string | null;
  createdOn: string;
  invoiceBalance: number;
  invoiceStatus: InvoiceStatus;
}

export interface RefundRow {
  refundId: number;
  paymentId: number;
  amount: number;
  method: string;
  reference: string | null;
  refundedOn: string;
  note: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  createdOn: string;
}

export interface PaymentDetail {
  payment: PaymentHeader;
  applications: PaymentApplicationRow[];
  refunds: RefundRow[];
}

export interface PaymentApplicationInput {
  invoiceId: number;
  invoiceLineId: number | null;
  amount: number;
}

export interface CreatePaymentRequest {
  sourceType: PaymentSourceType;
  payerId: number | null;
  clientId: number | null;
  method: PaymentMethod;
  reference: string | null;
  receivedOn: string;
  amount: number;
  note: string | null;
  applications: PaymentApplicationInput[] | null;
  autoApply: boolean;
}

export interface PaymentCreated {
  paymentId: number;
  isDuplicate: boolean;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  invoiceIdsJson: string | null;
}

export interface PaymentApplied {
  paymentId: number;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  invoiceIdsJson: string | null;
}

export interface PaymentReversed {
  paymentId: number;
  status: PaymentStatus;
  invoiceIdsJson: string | null;
}

export interface RefundRequest {
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  refundedOn: string;
  note: string | null;
}

export interface RefundCreated {
  refundId: number;
  paymentId: number;
  refundedAmount: number;
  unappliedAmount: number;
}

export interface PaymentPlan {
  applications: PaymentApplicationInput[];
  appliedAmount: number;
  unappliedAmount: number;
}

export interface OpenInvoice {
  clientInvoiceId: number;
  invoiceNumber: string | null;
  clientId: number;
  clientName: string | null;
  payerId: number | null;
  payerName: string | null;
  billToType: BillToType;
  billToName: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  periodFromUtc: string;
  periodToUtc: string;
  amount: number;
  amountPaid: number;
  amountAdjusted: number;
  balance: number;
  status: InvoiceStatus;
  daysPastDue: number;
}

export interface OpenInvoiceLine {
  lineId: number;
  clientInvoiceId: number;
  lineType: InvoiceLineType;
  serviceDate: string | null;
  description: string | null;
  procedureCode: string | null;
  units: number | null;
  amount: number;
  amountPaid: number;
  amountAdjusted: number;
  balance: number;
}

export interface OpenInvoices {
  invoices: OpenInvoice[];
  lines: OpenInvoiceLine[];
}

export interface PaymentListQuery {
  page?: number;
  pageSize?: number;
  sourceType?: PaymentSourceType | '';
  payerId?: number | null;
  clientId?: number | null;
  method?: PaymentMethod | '';
  source?: PaymentSource | '';
  status?: PaymentStatus | '';
  fromDate?: string | null;
  toDate?: string | null;
  onlyUnapplied?: boolean;
  officeId?: string | null;
  search?: string | null;
}

export type AgingGroupBy = 'Payer' | 'Client' | 'BillToType';

export interface AgingGroup extends AgingAmounts {
  groupKey: string;
  groupId: number | null;
  groupName: string;
}

export interface Aging {
  groups: AgingGroup[];
  totals: AgingAmounts;
}

export type PaymentReportGroupBy = 'Method' | 'Source' | 'Day' | 'Payer';

export interface PaymentReportGroup {
  groupKey: string;
  groupId: number | null;
  groupName: string;
  paymentCount: number;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  refundedAmount: number;
}

export interface PaymentReportRow {
  paymentId: number;
  sourceType: PaymentSourceType;
  payerId: number | null;
  payerName: string | null;
  clientId: number | null;
  clientName: string | null;
  method: PaymentMethod;
  source: PaymentSource;
  reference: string | null;
  receivedOn: string;
  amount: number;
  appliedAmount: number;
  refundedAmount: number;
  unappliedAmount: number;
  groupKey: string;
}

export interface PaymentReport {
  groups: PaymentReportGroup[];
  payments: PaymentReportRow[];
}

// ------------------------------------------------------------------ Client diagnoses

export interface ClientDiagnosis {
  clientDiagnosisId: number;
  clientId: number;
  /** Upper-case, no dot. */
  icdCode: string;
  description: string | null;
  sequence: number;
  isPrimary: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdByUserId: number | null;
  createdOn: string;
}

export interface ClientDiagnosisInput {
  icdCode: string;
  description: string | null;
  sequence: number;
  isPrimary: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

// ------------------------------------------------------------------ Settings ▸ Billing

export interface BillingSettings {
  settingsId: number;
  legalName: string | null;
  npi: string | null;
  taxId: string | null;
  taxonomyCode: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  payToAddress1: string | null;
  payToAddress2: string | null;
  payToCity: string | null;
  payToState: string | null;
  payToPostalCode: string | null;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  paymentTermsDays: number;
  defaultRoundingRule: RoundingRule;
  remitToText: string | null;
  invoiceFooter: string | null;
  writeOffApprovalThreshold: number;
  adminBillingAccess: BillingAccessLevel;
  managerBillingAccess: BillingAccessLevel;
  stripeAccountId: string | null;
  stripeConnectedOn: string | null;
  onlinePaymentsEnabled: boolean;
  qboRealmId: string | null;
  qboConnectedOn: string | null;
  qboEnabled: boolean;
  hasQboRefreshToken: boolean;
  eligibilityVendor: 'Manual' | 'PVerify';
  eligibilityClientId: string | null;
  hasEligibilitySecret: boolean;
  eligibilityRecheckDays: number;
  eligibilityBulkCap: number;
  claimRetentionYears: number;
  updatedOn: string | null;
}

/** PUT /billing/settings (full replace). nextInvoiceNumber null = keep. */
export interface UpdateBillingSettingsRequest {
  legalName: string | null;
  npi: string | null;
  taxId: string | null;
  taxonomyCode: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  payToAddress1: string | null;
  payToAddress2: string | null;
  payToCity: string | null;
  payToState: string | null;
  payToPostalCode: string | null;
  invoicePrefix: string;
  nextInvoiceNumber: number | null;
  paymentTermsDays: number;
  defaultRoundingRule: RoundingRule;
  remitToText: string | null;
  invoiceFooter: string | null;
  writeOffApprovalThreshold: number;
  claimRetentionYears: number;
}

export interface UpdateBillingAccessRequest {
  adminBillingAccess: BillingAccessLevel;
  managerBillingAccess: BillingAccessLevel;
}

export interface UpdateEligibilitySettingsRequest {
  eligibilityVendor: 'Manual' | 'PVerify';
  eligibilityClientId: string | null;
  /** Write-only; null = keep. */
  eligibilitySecret: string | null;
  clearSecret: boolean;
  eligibilityRecheckDays: number;
  eligibilityBulkCap: number;
}

export interface ClearinghouseSettings {
  settingsId: number;
  name: string | null;
  submitterId: string | null;
  submitterName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  receiverId: string | null;
  receiverName: string | null;
  isaSenderQualifier: string;
  isaReceiverQualifier: string;
  usageIndicator: 'T' | 'P';
  transport: 'Download' | 'Sftp';
  sftpHost: string | null;
  sftpPort: number;
  sftpUser: string | null;
  hasSftpSecret: boolean;
  /** SSH host-key fingerprint, e.g. "SHA256:…"; required before SFTP can connect. */
  sftpHostKeyFingerprint: string | null;
  sftpOutbound: string | null;
  sftpInbound: string | null;
  fileNamePattern: string | null;
  nextInterchangeControl: number;
  pollInbound: boolean;
  updatedOn: string | null;
}

export interface UpdateClearinghouseRequest {
  name: string | null;
  submitterId: string | null;
  submitterName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  receiverId: string | null;
  receiverName: string | null;
  isaSenderQualifier: string;
  isaReceiverQualifier: string;
  usageIndicator: 'T' | 'P';
  transport: 'Download' | 'Sftp';
  sftpHost: string | null;
  sftpPort: number;
  sftpUser: string | null;
  /** Write-only password or PEM key; null = keep. */
  sftpSecret: string | null;
  clearSftpSecret: boolean;
  sftpHostKeyFingerprint: string | null;
  sftpOutbound: string | null;
  sftpInbound: string | null;
  /** null = keep. */
  fileNamePattern: string | null;
  pollInbound: boolean;
}

export interface BillingCode {
  billingCodeId: number;
  serviceTypeId: number;
  serviceTypeName: string | null;
  payerId: number | null;
  payerName: string | null;
  procedureCode: string;
  modifier1: string | null;
  modifier2: string | null;
  modifier3: string | null;
  modifier4: string | null;
  revenueCode: string | null;
  placeOfService: string | null;
  unitType: UnitType;
  roundingRule: RoundingRule;
  minimumUnits: number;
  ratePerUnit: number | null;
  isActive: boolean;
  createdByUserId: number | null;
  createdOn: string;
  updatedOn: string | null;
}

export interface SaveBillingCodeRequest {
  serviceTypeId: number;
  /** null = the service default. */
  payerId: number | null;
  procedureCode: string;
  modifier1: string | null;
  modifier2: string | null;
  modifier3: string | null;
  modifier4: string | null;
  revenueCode: string | null;
  placeOfService: string | null;
  unitType: UnitType;
  roundingRule: RoundingRule;
  minimumUnits: number;
  /** Required for Visit / Day. */
  ratePerUnit: number | null;
}

export interface PayerEdi {
  payerId: number;
  payerEdiId: string | null;
  claimFilingIndicator: string | null;
  claimFormat: ClaimFormat;
  requiresAuthorizationNumber: boolean;
}

export interface PayerClaimRulesBase {
  lineRefG1: boolean;
  linePos: boolean;
  dateFormat: 'D8' | 'RD8';
  renderingRequired: boolean;
  maxLines: number;
  claimNumberSource: 'ClaimId' | 'PatientControlNo';
}

export interface PayerClaimRules extends PayerClaimRulesBase {
  payerId: number;
  isDefault: boolean;
  updatedOn: string | null;
}

/** GET /billing/settings/payers/{payerId}/edi: EDI fields + claim rules (null = defaults). */
export interface PayerEdiDetail extends PayerEdi {
  claimRules: PayerClaimRulesBase | null;
}

export interface UpdatePayerEdiRequest {
  payerEdiId: string | null;
  claimFilingIndicator: string | null;
  claimFormat: ClaimFormat;
  requiresAuthorizationNumber: boolean;
}

export const CLAIM_FILING_INDICATORS: { value: string; label: string }[] = [
  { value: 'MC', label: 'MC — Medicaid' },
  { value: 'MB', label: 'MB — Medicare Part B' },
  { value: 'MA', label: 'MA — Medicare Part A' },
  { value: 'CI', label: 'CI — Commercial insurance' },
  { value: 'BL', label: 'BL — Blue Cross / Blue Shield' },
  { value: 'HM', label: 'HM — HMO' },
  { value: 'VA', label: 'VA — Veterans Affairs' },
  { value: 'CH', label: 'CH — CHAMPUS / TRICARE' },
  { value: 'WC', label: "WC — Workers' compensation" },
  { value: 'ZZ', label: 'ZZ — Mutually defined' },
];

export interface AuthorizationModifiers {
  authorizationId: number;
  modifier1: string | null;
  modifier2: string | null;
  modifier3: string | null;
  modifier4: string | null;
}

export interface UserNpi {
  userId: number;
  npi: string | null;
}

export interface OAuthUrl {
  url: string;
}

export interface QboItemMapRow {
  serviceTypeId: number;
  serviceTypeName: string;
  isActive: boolean;
  qboItemId: string | null;
  qboItemName: string | null;
  updatedOn: string | null;
}

export interface QboItem {
  id: string;
  name: string;
  type: string;
}

export interface AccountingFailure {
  queueId: number;
  entityType: string;
  localId: string;
  operation: string;
  requestId: string;
  status: string;
  attempts: number;
  nextAttemptOn: string | null;
  lastError: string | null;
  createdOn: string;
  updatedOn: string | null;
}

// ------------------------------------------------------------------ Helpers

const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** $1,234.56 (null → —). */
export function money(value: number | null | undefined): string {
  return value == null ? '—' : usdFormat.format(value);
}

/** Rounds to cents (away from zero, like the API). */
export function cents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) * 100 + Number.EPSILON) / 100;
}

/** 'yyyy-MM-dd' part of a date-only / wall-clock value ('' when missing). */
export function dateOnly(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return m ? m[1] : '';
}

/** Today (browser local) as 'yyyy-MM-dd'; offsetDays shifts it. */
export function todayYmd(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return ymdOf(d);
}

/** First day of the current month (offsetMonths shifts it) as 'yyyy-MM-dd'. */
export function monthStartYmd(offsetMonths = 0): string {
  const d = new Date();
  return ymdOf(new Date(d.getFullYear(), d.getMonth() + offsetMonths, 1));
}

/** Last day of the month that starts at monthStartYmd(offsetMonths). */
export function monthEndYmd(offsetMonths = 0): string {
  const d = new Date();
  return ymdOf(new Date(d.getFullYear(), d.getMonth() + offsetMonths + 1, 0));
}

export function ymdOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Adds days to a 'yyyy-MM-dd' string without any time-zone shift. */
export function addDaysYmd(value: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return ymdOf(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 3, 2026" from a date-only / wall-clock string (no Date parsing of the string). */
export function fmtDate(value: string | null | undefined): string {
  const d = dateOnly(value);
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}

/** "Mar 3" (no year). */
export function fmtDateShort(value: string | null | undefined): string {
  const d = dateOnly(value);
  if (!d) return '—';
  const [, m, day] = d.split('-').map(Number);
  return `${MONTHS[m - 1]} ${day}`;
}

/** Wall-clock time "8:05 AM" of a 'yyyy-MM-ddTHH:mm' value (never converted). */
export function fmtWallTime(value: string | null | undefined): string {
  if (!value) return '';
  const m = /T(\d{2}):(\d{2})/.exec(value);
  if (!m) return '';
  let h = Number(m[1]);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

/** Invoice period label; the end is exclusive when it falls on midnight. */
export function periodLabel(fromUtc: string | null | undefined, toUtc: string | null | undefined): string {
  const from = dateOnly(fromUtc);
  let to = dateOnly(toUtc);
  if (!from) return '—';
  if (to && toUtc && /T00:00(:00)?/.test(toUtc) && to > from) to = addDaysYmd(to, -1);
  if (!to || to === from) return fmtDate(from);
  return from.slice(0, 4) === to.slice(0, 4) ? `${fmtDateShort(from)} – ${fmtDate(to)}` : `${fmtDate(from)} – ${fmtDate(to)}`;
}

export function invoiceStatusLabel(status: string | null | undefined): string {
  return INVOICE_STATUSES.find((s) => s.value === status)?.label ?? status ?? '—';
}

export function invoiceStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-100 text-slate-600';
    case 'Issued':
      return 'bg-indigo-50 text-indigo-700';
    case 'PartiallyPaid':
      return 'bg-amber-50 text-amber-700';
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700';
    case 'Void':
      return 'bg-slate-100 text-slate-500 line-through';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function invoiceNumberLabel(inv: { invoiceNumber: string | null; status: string }): string {
  return inv.status === 'Draft' || !inv.invoiceNumber ? 'Draft' : inv.invoiceNumber;
}

export function unitTypeLabel(u: string | null | undefined): string {
  return UNIT_TYPES.find((x) => x.value === u)?.label ?? u ?? '—';
}

/** "T1019:U1:U2" style code + modifiers. */
export function codeWithModifiers(code: string | null | undefined, ...mods: (string | null | undefined)[]): string {
  if (!code) return '—';
  const m = mods.filter((x) => !!x && x.trim());
  return m.length ? `${code} ${m.join(' ')}` : code;
}

export function accessLevelAllows(level: BillingAccessLevel | null | undefined, needed: BillingAccessLevel): boolean {
  const rank = { None: 0, Read: 1, Write: 2 } as const;
  return rank[level ?? 'None'] >= rank[needed];
}
