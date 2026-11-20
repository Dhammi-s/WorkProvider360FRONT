/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Electronic claims (837P), batches, inbound EDI (999 / 277CA / 835), remittances and
 * eligibility (ADR-0005). Mirrors the LLD "API contract (for the frontend)".
 */

// ------------------------------------------------------------------ Claims

export type ClaimStatus =
  | 'Draft'
  | 'Ready'
  | 'Submitted'
  | 'Accepted'
  | 'Rejected'
  | 'Paid'
  | 'PartiallyPaid'
  | 'Denied'
  | 'Void';

export const CLAIM_STATUSES: { value: ClaimStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Paid', label: 'Paid' },
  { value: 'PartiallyPaid', label: 'Partially paid' },
  { value: 'Denied', label: 'Denied' },
  { value: 'Void', label: 'Void' },
];

/** Statuses a user may set by hand (PATCH {id}/status). */
export const MANUAL_CLAIM_STATUSES: ClaimStatus[] = ['Submitted', 'Accepted', 'Rejected', 'Denied', 'Void'];

export type ClaimFrequency = '1' | '7' | '8';

export function claimFrequencyLabel(f: string | null | undefined): string {
  switch (f) {
    case '1':
      return 'Original';
    case '7':
      return 'Replacement';
    case '8':
      return 'Void';
    default:
      return f ?? '—';
  }
}

export interface ClaimListRow {
  claimId: number;
  claimNumber: string;
  status: ClaimStatus;
  frequencyCode: ClaimFrequency;
  originalClaimId: number | null;
  invoiceId: number;
  invoiceNumber: string | null;
  clientId: number;
  clientName: string | null;
  payerId: number;
  payerName: string | null;
  clientPayerId: number | null;
  placeOfService: string | null;
  authorizationNumber: string | null;
  payerClaimControlNumber: string | null;
  serviceFrom: string | null;
  serviceTo: string | null;
  totalCharge: number;
  paidAmount: number;
  patientResponsibility: number;
  /** JSON array string or null. */
  validationErrors: string | null;
  submittedOn: string | null;
  lastStatusOn: string | null;
  createdOn: string;
  lineCount: number;
}

export interface ClaimHeader extends Omit<ClaimListRow, 'lineCount'> {
  originalClaimNumber: string | null;
  clientOfficeId: string | null;
  payerEdiId: string | null;
  memberId: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  updatedOn: string | null;
}

export interface ClaimLine {
  claimLineId: number;
  claimId: number;
  invoiceLineId: number;
  lineNumber: number;
  lineControlNumber: string;
  serviceDate: string | null;
  procedureCode: string | null;
  modifier1: string | null;
  modifier2: string | null;
  modifier3: string | null;
  modifier4: string | null;
  units: number;
  unitType: string | null;
  charge: number;
  paidAmount: number;
  status: string | null;
  authorizationNumber: string | null;
  description: string | null;
}

export interface ClaimDiagnosisRow {
  claimId: number;
  sequence: number;
  icdCode: string;
}

export type ClaimEventSource = '999' | '277CA' | '835' | 'Manual' | 'System';

export interface ClaimEvent {
  eventId: number;
  claimId: number;
  source: ClaimEventSource;
  status: string | null;
  category: string | null;
  code: string | null;
  message: string | null;
  occurredOn: string;
  ediInboundFileId: number | null;
  createdByUserId: number | null;
  createdByName: string | null;
}

export interface ClaimSubmissionRef {
  submissionId: number;
  interchangeControlNumber: string;
  groupControlNumber: string | null;
  fileName: string | null;
  status: string;
  createdOn: string;
  uploadedOn: string | null;
}

export interface ClaimDetail {
  claim: ClaimHeader;
  lines: ClaimLine[];
  diagnoses: ClaimDiagnosisRow[];
  events: ClaimEvent[];
  submissions: ClaimSubmissionRef[];
}

export interface ClaimListQuery {
  page?: number;
  pageSize?: number;
  status?: ClaimStatus | '';
  workQueue?: boolean;
  payerId?: number | null;
  clientId?: number | null;
  invoiceId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  officeId?: string | null;
  search?: string | null;
}

export interface ClaimValidationResult {
  claimId: number;
  claimNumber: string;
  status: ClaimStatus;
  errors: string[];
}

export interface ClaimCreateResult {
  claims: ClaimValidationResult[];
  warnings: string[];
}

export interface ClaimStatusResult {
  claimId: number;
  status: ClaimStatus;
}

export interface SetClaimStatusRequest {
  status: ClaimStatus;
  category: string | null;
  code: string | null;
  message: string | null;
  payerClaimControlNumber: string | null;
}

export interface ClaimBatchResult {
  submissionId: number;
  fileName: string;
  interchangeControlNumber: string;
  claimCount: number;
  totalCharge: number;
  transport: 'Download' | 'Sftp';
  status: 'Generated' | 'Uploaded';
  uploadError: string | null;
}

export type SubmissionStatus = 'Generated' | 'Uploaded' | 'Accepted' | 'Rejected' | 'PartiallyAccepted';

export interface Submission {
  submissionId: number;
  interchangeControlNumber: string;
  groupControlNumber: string | null;
  fileName: string | null;
  claimCount: number;
  totalCharge: number;
  transport: 'Download' | 'Sftp';
  usageIndicator: 'T' | 'P' | null;
  status: SubmissionStatus;
  uploadedOn: string | null;
  downloadedOn: string | null;
  uploadAttempts: number;
  lastError: string | null;
  ackOn: string | null;
  createdByUserId: number | null;
  createdByName: string | null;
  createdOn: string;
}

export interface SubmissionClaim {
  claimId: number;
  claimNumber: string;
  status: ClaimStatus;
  clientId: number;
  clientName: string | null;
  payerId: number;
  payerName: string | null;
  totalCharge: number;
}

export interface SubmissionDetail {
  submission: Submission;
  claims: SubmissionClaim[];
}

export interface SubmissionUploaded {
  submissionId: number;
  status: SubmissionStatus;
  uploadAttempts: number;
}

/**
 * Groups claim validation messages by level. The API prefixes each message with
 * "Agency:", "Payer:", "Client:", "Claim:" or "Line n:".
 */
export function groupValidationErrors(errors: string[]): { level: string; messages: string[] }[] {
  const order = ['Agency', 'Payer', 'Client', 'Claim', 'Lines', 'Other'];
  const map = new Map<string, string[]>();
  for (const raw of errors) {
    const m = /^(Agency|Payer|Client|Claim|Line\s*\d+)\s*:\s*(.*)$/i.exec(raw.trim());
    let level = 'Other';
    let msg = raw;
    if (m) {
      const key = m[1].toLowerCase();
      level = key.startsWith('line') ? 'Lines' : key.charAt(0).toUpperCase() + key.slice(1);
      msg = key.startsWith('line') ? `${m[1]}: ${m[2]}` : m[2];
    }
    if (!map.has(level)) map.set(level, []);
    map.get(level)!.push(msg);
  }
  return order.filter((l) => map.has(l)).map((level) => ({ level, messages: map.get(level)! }));
}

/** Parses ClaimListRow.validationErrors (JSON array string). */
export function parseValidationErrors(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [json];
  }
}

export function claimStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-100 text-slate-600';
    case 'Ready':
      return 'bg-sky-50 text-sky-700';
    case 'Submitted':
      return 'bg-indigo-50 text-indigo-700';
    case 'Accepted':
      return 'bg-teal-50 text-teal-700';
    case 'Rejected':
    case 'Denied':
      return 'bg-red-50 text-red-700';
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

export function claimStatusLabel(status: string | null | undefined): string {
  return CLAIM_STATUSES.find((s) => s.value === status)?.label ?? status ?? '—';
}

export function submissionStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'Generated':
      return 'bg-slate-100 text-slate-600';
    case 'Uploaded':
      return 'bg-indigo-50 text-indigo-700';
    case 'Accepted':
      return 'bg-emerald-50 text-emerald-700';
    case 'PartiallyAccepted':
      return 'bg-amber-50 text-amber-700';
    case 'Rejected':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

// ------------------------------------------------------------------ Inbound EDI / remittances

export type EdiFileType = '999' | '277CA' | '835' | 'Unknown';

export interface EdiImportResult {
  fileId: number;
  fileName: string;
  fileType: EdiFileType;
  isDuplicate: boolean;
  status: 'Received' | 'Processed' | 'Failed';
  messages: string[];
  remittanceIds: number[];
}

export interface InboundPollResult {
  fileCount: number;
  files: EdiImportResult[];
}

export type RemittanceStatus = 'Imported' | 'Unmatched' | 'PartiallyPosted' | 'Posted';

export const REMITTANCE_STATUSES: { value: RemittanceStatus; label: string }[] = [
  { value: 'Imported', label: 'Imported' },
  { value: 'Unmatched', label: 'Unmatched' },
  { value: 'PartiallyPosted', label: 'Partially posted' },
  { value: 'Posted', label: 'Posted' },
];

export function remittanceStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'Posted':
      return 'bg-emerald-50 text-emerald-700';
    case 'PartiallyPosted':
      return 'bg-amber-50 text-amber-700';
    case 'Unmatched':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-indigo-50 text-indigo-700';
  }
}

export interface RemittanceListRow {
  remittanceId: number;
  fileId: number;
  payerName: string | null;
  payerIdentifier: string | null;
  payerId: number | null;
  agencyPayerName: string | null;
  payeeNpi: string | null;
  traceNumber: string | null;
  paymentMethod: string | null;
  paymentAmount: number;
  paymentDate: string | null;
  status: RemittanceStatus;
  paymentId: number | null;
  postedOn: string | null;
  createdOn: string;
  claimCount: number;
  unmatchedClaimCount: number;
}

export interface RemittanceHeader {
  remittanceId: number;
  fileId: number;
  payerName: string | null;
  payerIdentifier: string | null;
  payerId: number | null;
  agencyPayerName: string | null;
  payeeNpi: string | null;
  traceNumber: string | null;
  paymentMethod: string | null;
  paymentAmount: number;
  paymentDate: string | null;
  status: RemittanceStatus;
  paymentId: number | null;
  paymentAppliedAmount: number | null;
  paymentUnappliedAmount: number | null;
  providerAdjustmentsJson: string | null;
  postedByUserId: number | null;
  postedOn: string | null;
  createdOn: string;
}

export type RemittanceMatchStatus = 'Matched' | 'Unmatched' | 'Manual';

export interface RemittanceClaim {
  remittanceClaimId: number;
  remittanceId: number;
  claimNumber: string | null;
  statusCode: string | null;
  chargeAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  payerClaimControlNumber: string | null;
  patientName: string | null;
  memberId: string | null;
  matchStatus: RemittanceMatchStatus;
  matchedClaimId: number | null;
  matchedClaimNumber: string | null;
  matchedClaimStatus: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  clientId: number | null;
  clientName: string | null;
  claimPayerId: number | null;
  isPosted: boolean;
  postedOn: string | null;
}

export interface RemittanceLine {
  remittanceLineId: number;
  remittanceClaimId: number;
  procedureCode: string | null;
  modifiers: string | null;
  chargeAmount: number;
  paidAmount: number;
  units: number | null;
  lineControlNumber: string | null;
  serviceDate: string | null;
  matchedClaimLineId: number | null;
  matchedLineControlNumber: string | null;
  invoiceLineId: number | null;
  invoiceId: number | null;
  invoiceLineAmount: number | null;
  invoiceLineBalance: number | null;
}

export interface RemittanceAdjustment {
  remittanceAdjustmentId: number;
  remittanceClaimId: number;
  remittanceLineId: number | null;
  groupCode: string;
  reasonCode: string;
  /** CARC label. */
  reasonDescription: string | null;
  amount: number;
  quantity: number | null;
}

export interface RemittanceDetail {
  remittance: RemittanceHeader;
  claims: RemittanceClaim[];
  lines: RemittanceLine[];
  adjustments: RemittanceAdjustment[];
}

export interface RemittanceListQuery {
  page?: number;
  pageSize?: number;
  status?: RemittanceStatus | '';
  payerId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  search?: string | null;
}

export interface RemittanceMatchRow {
  remittanceClaimId: number;
  claimNumber: string | null;
  matchStatus: RemittanceMatchStatus;
  matchedClaimId: number | null;
  matchedClaimNumber: string | null;
  invoiceId: number | null;
  isPosted: boolean;
  lineCount: number;
  matchedLineCount: number;
  paidAmount: number;
}

export interface ManualMatchRequest {
  /** null clears the match. */
  claimId: number | null;
  lineMatches: { remittanceLineId: number; claimLineId: number }[];
}

export interface RemittancePostResult {
  result: {
    remittanceId: number;
    status: RemittanceStatus;
    paymentId: number | null;
    paymentAmount: number;
    appliedAmount: number;
    unappliedAmount: number;
    adjustmentCount: number;
    patientResponsibilityLineCount: number;
  };
  invoices: {
    invoiceId: number;
    invoiceNumber: string | null;
    status: string;
    balance: number;
    isPatientResponsibilityDraft: boolean;
  }[];
  postedClaimCount: number;
  warnings: string[];
}

/** CAS group codes. */
export function casGroupLabel(code: string | null | undefined): string {
  switch (code) {
    case 'CO':
      return 'Contractual obligation';
    case 'PR':
      return 'Patient responsibility';
    case 'OA':
      return 'Other adjustment';
    case 'PI':
      return 'Payer initiated';
    case 'CR':
      return 'Correction / reversal';
    default:
      return code ?? '';
  }
}

// ------------------------------------------------------------------ Eligibility

export type EligibilityStatus = 'Queued' | 'Active' | 'Inactive' | 'Error';

export interface EligibilityCheck {
  checkId: number;
  clientId: number;
  clientName?: string | null;
  clientPayerId: number;
  payerId: number | null;
  payerName: string | null;
  serviceDate: string;
  vendor: 'Manual' | 'PVerify';
  status: EligibilityStatus;
  planName: string | null;
  groupNumber: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  message: string | null;
  isManual: boolean;
  bulkRunId: number | null;
  checkedByUserId: number | null;
  checkedByName: string | null;
  checkedOn: string;
  /** Latest only. */
  isFresh?: boolean | null;
  /** History with includeRaw only. */
  rawResponse?: string | null;
}

export interface EligibilityResult {
  check: EligibilityCheck;
  fromCache: boolean;
}

export interface EligibilityCheckRequest {
  clientId: number;
  clientPayerId: number;
  serviceDate: string;
  force: boolean;
  /** pVerify payer code; required until the DB exposes Payers.PayerEdiId. */
  payerCode: string | null;
}

export interface ManualEligibilityRequest {
  clientId: number;
  clientPayerId: number;
  serviceDate: string;
  status: 'Active' | 'Inactive' | 'Error';
  planName: string | null;
  groupNumber: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  message: string | null;
}

export interface EligibilityBulkRequest {
  serviceDate: string;
  officeId: string | null;
  payerTypes: string[] | null;
  force: boolean;
}

export interface EligibilityBulkQueued {
  bulkRunId: number;
  eligibleCount: number;
  queuedCount: number;
  capped: boolean;
  cap: number;
}

export function eligibilityStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700';
    case 'Inactive':
      return 'bg-red-50 text-red-700';
    case 'Error':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}
