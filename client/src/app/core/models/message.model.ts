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
/** `InAppOnly` (push): no phone registered, the message is in the person's bell only. */
export type RecipientStatus = 'Pending' | 'Sent' | 'Failed' | 'Skipped' | 'InAppOnly';
export type RecipientField = 'To' | 'Cc' | 'Bcc' | 'Self';
export type ChipType = 'User' | 'Client' | 'Group' | 'External';
export type GroupType = 'AllStaff' | 'Role' | 'Office' | 'AllClients' | 'OfficeClients';
export type SkipReason =
  | 'NoEmail' | 'Inactive' | 'OutOfScope' | 'Invalid' | 'Duplicate' | 'ExternalNotAllowed' | 'NotFound' | 'NoAppAccount';
/** Delivery channel (ADR-0007): the same compose page, history and settings serve both. */
export type MessageChannel = 'Email' | 'Push';
export type PushUnavailableReason = 'PushDisabled' | 'PushMasterOff' | 'PushEventOff' | 'FirebaseNotConfigured' | 'NoPermission';

export const MESSAGE_STATUSES: MessageStatus[] = ['Queued', 'Sending', 'Sent', 'PartiallyFailed', 'Failed', 'Deferred'];
export const MESSAGE_CHANNELS: MessageChannel[] = ['Email', 'Push'];
/** Contract §4.4 defaults, used until / unless the access call says otherwise. */
export const PUSH_MAX_TITLE = 100;
export const PUSH_MAX_MESSAGE = 500;

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
  /** Push channel (ADR-0007): false ⇒ the Push tab is disabled with `pushUnavailableReason`. */
  pushAvailable?: boolean;
  pushUnavailableReason?: PushUnavailableReason | string | null;
  pushMaxTitle?: number;
  pushMaxMessage?: number;
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
  /** Push: "send to my devices too". */
  sendCopyToSender: boolean;
  /** Default Email. Push: cc / bcc must be empty. */
  channel?: MessageChannel;
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
  channel?: MessageChannel;
  /** Push: people with at least one registered phone. */
  withApp?: number;
  /** Push: people without a registered phone (bell only). */
  inAppOnly?: number;
}

export interface PreviewRequest {
  /** Push: the title. */
  subject: string;
  /** Push: the plain-text message. */
  html: string;
  replyToMode: ReplyToMode;
  replyToAddress?: string | null;
  to: RecipientChip[];
  channel?: MessageChannel;
}

export interface PreviewResult {
  subject: string;
  /** Null for Push. */
  html: string | null;
  /** Push: the message personalized for the first To recipient. */
  text?: string | null;
  fromDisplayName: string;
  replyTo?: string | null;
}

/** `POST api/messages/push` (JSON). */
export interface SendPushRequest {
  title: string;
  message: string;
  /** "Send to my devices too". */
  sendCopyToSender: boolean;
  to: RecipientChip[];
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
  channel?: MessageChannel | '' | null;
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
  /** Missing ⇒ Email (older API). */
  channel?: MessageChannel;
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
  /** Push: the app login of the person. */
  userId?: number | null;
  /** Push: devices that accepted / rejected the push. */
  devicesSent?: number | null;
  devicesFailed?: number | null;
}

export interface MessageDetail {
  messageId: number;
  /** Push: the title. */
  subject: string;
  /** Push: the plain-text message — show as text, never as HTML. */
  bodyHtml: string;
  /** Missing ⇒ Email (older API). */
  channel?: MessageChannel;
  /** Push: recipients without a registered phone (bell only). */
  inAppOnlyCount?: number;
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
  /** Push channel on/off for the agency (default on). */
  pushEnabled: boolean;
  /** 1–100 (default 20). */
  pushRatePerSecond: number;
  updatedOn?: string | null;
}

/** Channel of a list item / detail; older API responses have none ⇒ Email. */
export function messageChannel(m: { channel?: MessageChannel | string | null } | null | undefined): MessageChannel {
  return m?.channel === 'Push' ? 'Push' : 'Email';
}

/** Readable sentence for `MessageAccess.pushUnavailableReason`. */
export function pushUnavailableText(reason: string | null | undefined): string {
  switch (reason) {
    case 'PushDisabled': return 'Push notifications are turned off for your agency (Settings → Messages → “Allow push notifications”).';
    case 'PushMasterOff': return 'Push notifications are switched off for your agency (Settings → SMS & Push).';
    case 'PushEventOff': return 'The “Custom push notifications” event is turned off (Settings → SMS & Push).';
    case 'FirebaseNotConfigured': return 'Push isn’t set up on the server yet (Firebase key missing).';
    case 'NoPermission': return 'Your role isn’t allowed to send push notifications.';
    default: return 'Push notifications aren’t available right now.';
  }
}

/** Human label for a status pill. */
export function messageStatusLabel(status: string): string {
  switch (status) {
    case 'PartiallyFailed': return 'Partially failed';
    case 'InAppOnly': return 'In app only';
    default: return status;
  }
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
    case 'InAppOnly':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
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
    case 'NoAppAccount': return 'no app account';
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
