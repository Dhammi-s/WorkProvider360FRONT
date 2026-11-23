/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Send Custom Message (ADR-0006). Shapes follow the binding contract
 * `docs/lld/custom-messages-contract.md` §3 (camelCase JSON, ApiResponse envelope).
 */

export type MessageAccessLevel = 'None' | 'Read' | 'Write';
export type MessageScope = 'All' | 'Office' | 'Self';
export type ReplyToMode = 'NoReply' | 'Sender' | 'Agency' | 'Custom';
export type MessageStatus = 'Queued' | 'Sending' | 'Sent' | 'PartiallyFailed' | 'Failed' | 'Deferred';
export type RecipientStatus = 'Pending' | 'Sent' | 'Failed' | 'Skipped';
export type RecipientField = 'To' | 'Cc' | 'Bcc' | 'Self';
export type ChipType = 'User' | 'Client' | 'Group' | 'External';
export type GroupType = 'AllStaff' | 'Role' | 'Office' | 'AllClients' | 'OfficeClients';
export type SkipReason = 'NoEmail' | 'Inactive' | 'OutOfScope' | 'Invalid' | 'Duplicate' | 'ExternalNotAllowed' | 'NotFound';

export const MESSAGE_STATUSES: MessageStatus[] = ['Queued', 'Sending', 'Sent', 'PartiallyFailed', 'Failed', 'Deferred'];

export interface ReplyToOption {
  mode: ReplyToMode;
  label: string;
  address?: string | null;
}

export interface MessageAccess {
  canSend: boolean;
  canView: boolean;
  canManageSettings: boolean;
  scope: MessageScope;
  includeClients: boolean;
  allowExternalAddresses: boolean;
  maxRecipientsPerMessage: number;
  maxFileBytes: number;
  maxFiles: number;
  maxTotalBytes: number;
  allowedExtensions: string[];
  replyToOptions: ReplyToOption[];
  hasRecentFailures: boolean;
}

/** A recipient chip as sent to the API (request side). */
export interface RecipientChip {
  type: ChipType;
  id?: number | null;
  groupType?: GroupType | string | null;
  groupValue?: string | null;
  email?: string | null;
  label?: string | null;
}

/** A typeahead option from `GET recipients/search`. */
export interface RecipientOption {
  type: 'User' | 'Client' | 'Group';
  id?: number | null;
  groupType?: GroupType | string | null;
  groupValue?: string | null;
  label: string;
  email?: string | null;
  subLabel?: string | null;
  avatarUrl?: string | null;
  memberCount?: number | null;
}

export type RecipientSearchType = 'all' | 'user' | 'client' | 'group';

export interface ResolveRequest {
  to: RecipientChip[];
  cc: RecipientChip[];
  bcc: RecipientChip[];
  sendCopyToSender: boolean;
}

export interface FieldSample {
  label: string;
  email: string;
  type: string;
}

export interface FieldSummary {
  count: number;
  users: number;
  clients: number;
  external: number;
  sample: FieldSample[];
}

export interface SkippedRecipient {
  label: string;
  email?: string | null;
  reason: SkipReason | string;
  field: RecipientField | string;
}

export interface ResolveResult {
  to: FieldSummary;
  cc: FieldSummary;
  bcc: FieldSummary;
  self?: { email: string } | null;
  totalRecipients: number;
  totalEmails: number;
  maxRecipients: number;
  overLimit: boolean;
  skipped: SkippedRecipient[];
  duplicatesRemoved: number;
}

export interface PreviewRequest {
  subject: string;
  html: string;
  replyToMode: ReplyToMode;
  replyToAddress?: string | null;
  to: RecipientChip[];
}

export interface PreviewResult {
  subject: string;
  html: string;
  fromDisplayName: string;
  replyTo?: string | null;
}

export interface SendMessageRequest {
  subject: string;
  html: string;
  replyToMode: ReplyToMode;
  replyToAddress?: string | null;
  sendCopyToSender: boolean;
  to: RecipientChip[];
  cc: RecipientChip[];
  bcc: RecipientChip[];
}

export interface SendMessageResult {
  messageId: number;
  recipientCount: number;
  deferredWarning?: string | null;
}

export interface MessageListQuery {
  page?: number;
  pageSize?: number;
  status?: MessageStatus | '' | null;
  /** yyyy-MM-dd */
  from?: string | null;
  /** yyyy-MM-dd */
  to?: string | null;
  search?: string | null;
  mine?: boolean;
}

/** `PagedResult<T>` of this API (`totalCount`, unlike the older `PagedResult.total`). */
export interface MessagePage<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface MessageListItem {
  messageId: number;
  subject: string;
  senderUserId: number;
  senderName: string;
  status: MessageStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  attachmentCount: number;
  createdOn: string;
  completedOn?: string | null;
  nextAttemptOn?: string | null;
}

export interface MessageAttachment {
  attachmentId: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  isInline: boolean;
  isPurged: boolean;
}

export interface MessageRecipient {
  recipientId: number;
  field: RecipientField;
  sourceType: 'User' | 'Client' | 'External' | 'Group';
  groupLabel?: string | null;
  email: string;
  displayName?: string | null;
  status: RecipientStatus;
  error?: string | null;
  attempts: number;
  sentOn?: string | null;
}

export interface MessageDetail {
  messageId: number;
  subject: string;
  bodyHtml: string;
  senderUserId: number;
  senderName: string;
  senderEmail?: string | null;
  replyToMode: ReplyToMode;
  replyToAddress?: string | null;
  sendCopyToSender: boolean;
  status: MessageStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  toCount: number;
  ccCount: number;
  bccCount: number;
  createdOn: string;
  startedOn?: string | null;
  completedOn?: string | null;
  nextAttemptOn?: string | null;
  canRetry: boolean;
  attachments: MessageAttachment[];
  recipients: MessageRecipient[];
  recipientTotal: number;
  recipientPage: number;
  recipientPageSize: number;
}

export interface MessageDetailQuery {
  recipientPage?: number;
  recipientPageSize?: number;
  recipientStatus?: RecipientStatus | '' | null;
}

export interface MessageSettings {
  adminAccess: MessageAccessLevel;
  managerAccess: MessageAccessLevel;
  userCanSend: boolean;
  allowExternalAddresses: boolean;
  maxRecipientsPerMessage: number;
  dailySendLimit: number;
  sendRatePerSecond: number;
  attachmentRetentionDays: number;
  allowReplyToSender: boolean;
  allowReplyToAgency: boolean;
  allowCustomReplyTo: boolean;
  updatedOn?: string | null;
}

/** Human label for a status pill. */
export function messageStatusLabel(status: string): string {
  return status === 'PartiallyFailed' ? 'Partially failed' : status;
}

/** Tailwind classes for a message / recipient status pill. */
export function messageStatusClass(status: string): string {
  switch (status) {
    case 'Sent':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'PartiallyFailed':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'Failed':
      return 'bg-red-50 text-red-700 ring-red-200';
    case 'Sending':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'Deferred':
      return 'bg-violet-50 text-violet-700 ring-violet-200';
    case 'Skipped':
      return 'bg-slate-100 text-slate-500 ring-slate-200';
    default: // Queued / Pending
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

/** Friendly text for a resolve skip reason. */
export function skipReasonLabel(reason: string): string {
  switch (reason) {
    case 'NoEmail': return 'no email address';
    case 'Inactive': return 'inactive';
    case 'OutOfScope': return 'outside your office';
    case 'Invalid': return 'invalid address';
    case 'Duplicate': return 'duplicate';
    case 'ExternalNotAllowed': return 'external addresses are not allowed';
    case 'NotFound': return 'not found';
    default: return reason;
  }
}

/** "1.2 MB" style size. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/** The `*On` stamps are UTC (sysutcdatetime); Dapper may send them without a zone — mark them UTC
 *  so the date pipe shows local time. */
export function utc(value: string | null | undefined): string | null {
  if (!value) return null;
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + 'Z';
}
