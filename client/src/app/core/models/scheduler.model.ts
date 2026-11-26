/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Mirrors the backend scheduling DTOs. Times are ISO-8601 UTC strings. */

export type AccessLevel = 'None' | 'Read' | 'Write' | 'Self';

export type ScheduleStatus =
  | 'Scheduled'
  | 'Accepted'
  | 'Rejected'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

export type NoteType = 'Note' | 'Injury';

/** The current user's effective scheduling permissions. */
export interface SchedulingAccess {
  roleName: string;
  accessLevel: AccessLevel;
  isSuperAdmin: boolean;
  canViewAll: boolean;
  canManage: boolean;
  canManageAccess: boolean;
  isSelfScoped: boolean;
  /** Can approve / un-approve schedules (SuperAdmin always; Admin / Manager per settings). */
  canApprove: boolean;
  /** May create invoices that include unapproved schedules (per-role setting). */
  canInvoiceUnapproved: boolean;
}

export interface SchedulingSettings {
  adminAccess: AccessLevel;
  managerAccess: AccessLevel;
  defaultPayRatePerHour: number;
  defaultBillRatePerHour: number;
  defaultOvertimeMultiplier: number;
  notifyAdminOnCreate: boolean;
  notifyManagerOnCreate: boolean;
  autoClockEnabled: boolean;
  adminCanApproveSchedules: boolean;
  managerCanApproveSchedules: boolean;
  superAdminCanInvoiceUnapproved: boolean;
  adminCanInvoiceUnapproved: boolean;
  managerCanInvoiceUnapproved: boolean;
  /** What happens when a visit exceeds a payer authorization (SuperAdmin edits). */
  authorizationLimitPolicy?: 'Allow' | 'Warn' | 'Block';
  // ---- Scheduling automation (SuperAdmin edits via PUT settings/automation) ----
  missedClockInGraceMinutes?: number;
  missedClockOutGraceMinutes?: number;
  notifyCaregiverOnMissedClock?: boolean;
  notifyOfficeOnMissedClock?: boolean;
  openShiftAssignmentMode?: OpenShiftAssignmentMode;
  confirmationReminderHours?: number;
  compatibilityPolicy?: CompatibilityPolicy;
  authorizationExpiryNoticeDays?: number;
  updatedOn: string;
}

export type OpenShiftAssignmentMode = 'AdminPicks' | 'FirstToAccept';
export type CompatibilityPolicy = 'Allow' | 'Warn' | 'Block';

/** PUT /api/scheduling/settings/automation (SuperAdmin only). */
export interface UpdateSchedulingAutomation {
  missedClockInGraceMinutes: number;
  missedClockOutGraceMinutes: number;
  notifyCaregiverOnMissedClock: boolean;
  notifyOfficeOnMissedClock: boolean;
  openShiftAssignmentMode: OpenShiftAssignmentMode;
  confirmationReminderHours: number;
  compatibilityPolicy: CompatibilityPolicy;
  authorizationExpiryNoticeDays: number;
}

/** Who approves schedules, and which roles may invoice unapproved ones (SuperAdmin only). */
export interface UpdateSchedulingApproval {
  adminCanApproveSchedules: boolean;
  managerCanApproveSchedules: boolean;
  superAdminCanInvoiceUnapproved: boolean;
  adminCanInvoiceUnapproved: boolean;
  managerCanInvoiceUnapproved: boolean;
}

/** Status picked when creating a schedule; Approved needs approve permission. */
export type InitialScheduleStatus = 'Scheduled' | 'Approved' | 'Cancelled';

export interface UpdateSchedulingAccess {
  adminAccess: AccessLevel;
  managerAccess: AccessLevel;
}

export interface UpdateSchedulingDefaults {
  defaultPayRatePerHour: number;
  defaultBillRatePerHour: number;
  defaultOvertimeMultiplier: number;
  notifyAdminOnCreate: boolean;
  notifyManagerOnCreate: boolean;
  autoClockEnabled: boolean;
}

export interface Schedule {
  scheduleId: number;
  title: string;
  customerName?: string | null;
  location?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  serviceTypeId?: number | null;
  serviceTypeName?: string | null;
  /** null = open shift (not assigned yet). */
  assignedUserId: number | null;
  /** "" for open shifts. */
  assignedUserName: string;
  isOpenShift?: boolean;
  /** Set when the visit was published from a master schedule (series). */
  seriesId?: number | null;
  seriesSlotId?: number | null;
  occurrenceDate?: string | null;
  /** True once a series visit was edited by hand. */
  isSeriesException?: boolean;
  startUtc: string;
  endUtc: string;
  payRatePerHour: number;
  billRatePerHour: number;
  overtimeMultiplier: number;
  status: ScheduleStatus;
  rejectionReason?: string | null;
  colorTag?: string | null;
  /** Approval is separate from status; only approved schedules are invoiced by default. */
  isApproved: boolean;
  approvedByUserId?: number | null;
  approvedByName?: string | null;
  approvedOn?: string | null;
  createdByUserId: number;
  createdOn: string;
  updatedOn: string;
}

export interface ScheduleNote {
  noteId: number;
  scheduleId: number;
  authorUserId: number;
  authorName: string;
  noteType: NoteType;
  message: string;
  createdOn: string;
}

export interface TimeEntry {
  timeEntryId: number;
  scheduleId: number;
  userId: number;
  userName: string;
  clockInUtc: string;
  clockOutUtc?: string | null;
  clockInLatitude?: number | null;
  clockInLongitude?: number | null;
  clockOutLatitude?: number | null;
  clockOutLongitude?: number | null;
  hasClockInSignature?: boolean;
  hasClockOutSignature?: boolean;
  source: 'Timer' | 'Manual' | 'Auto';
  note?: string | null;
  hours: number;
}

export interface ScheduleDetail {
  schedule: Schedule;
  notes: ScheduleNote[];
  timeEntries: TimeEntry[];
}

export interface CreateScheduleRequest {
  title: string;
  customerName?: string | null;
  location?: string | null;
  clientId?: number | null;
  serviceTypeId?: number | null;
  /** Optional when isOpenShift is true (then ignored). */
  assignedUserId?: number | null;
  isOpenShift?: boolean;
  /** Create only; null / [] = every eligible caregiver. */
  offerToUserIds?: number[] | null;
  startUtc: string;
  endUtc: string;
  payRatePerHour: number;
  billRatePerHour: number;
  overtimeMultiplier: number;
  colorTag?: string | null;
  status?: InitialScheduleStatus;
  notifyAdmin: boolean;
  notifyManager: boolean;
}

export interface UpdateScheduleRequest {
  title: string;
  customerName?: string | null;
  location?: string | null;
  clientId?: number | null;
  serviceTypeId?: number | null;
  assignedUserId?: number | null;
  isOpenShift?: boolean;
  startUtc: string;
  endUtc: string;
  payRatePerHour: number;
  billRatePerHour: number;
  overtimeMultiplier: number;
  colorTag?: string | null;
}

export interface RespondScheduleRequest {
  action: 'Accept' | 'Reject';
  reason?: string | null;
}

export interface CreateScheduleNoteRequest {
  noteType: NoteType;
  message: string;
}

export interface ManualTimeEntryRequest {
  clockInUtc: string;
  clockOutUtc: string;
  note?: string | null;
}

export interface ScheduleReportRow {
  userId: number;
  userName: string;
  scheduleCount: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  /** The same figures for approved schedules only. */
  approvedScheduleCount: number;
  unapprovedScheduleCount: number;
  approvedRegularHours: number;
  approvedOvertimeHours: number;
  approvedTotalHours: number;
  approvedTotalPay: number;
}

export interface ScheduleReport {
  fromUtc: string;
  toUtc: string;
  rows: ScheduleReportRow[];
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalHours: number;
  totalPay: number;
}

// ---- Live location tracking ----

export interface RecordLocationRequest {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

export interface LocationPing {
  pingId: number;
  scheduleId: number;
  userId: number;
  userName: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedUtc: string;
}

export interface LiveLocation {
  scheduleId: number;
  title: string;
  userId: number;
  userName: string;
  customerName?: string | null;
  location?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedUtc: string;
}

// ---- Clock in/out payload + client signatures ----

export interface ClockRequest {
  latitude?: number | null;
  longitude?: number | null;
  signatureBase64?: string | null;
  signedByName?: string | null;
}

export type SignaturePhase = 'ClockIn' | 'ClockOut';

export interface TimeEntrySignature {
  signatureId: number;
  timeEntryId: number;
  phase: SignaturePhase;
  signatureBase64: string;
  signedByName?: string | null;
  signedOnUtc: string;
}

/** One chronological event on a shift's care log (mirrors CareLogEntryDto). */
export interface CareLogEntry {
  type: 'ClockIn' | 'ClockOut' | 'Note' | 'Injury' | 'Signature';
  timestampUtc: string;
  actorName: string;
  message?: string | null;
  source?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phase?: string | null;
  signedByName?: string | null;
  signatureBase64?: string | null;
}

/** An overlapping shift for a caregiver (double-booking check; ScheduleConflictDto). */
export interface ScheduleConflict {
  scheduleId: number;
  title: string;
  clientId?: number | null;
  clientName?: string | null;
  assignedUserId: number;
  assignedUserName: string;
  startUtc: string;
  endUtc: string;
  status: string;
  /** Overlap (another visit; the fields above describe it) | Unavailable | Compatibility. */
  kind?: ScheduleConflictKind;
  /** Unavailable | Blocked | MissingRequired | HasAvoided | GenderMismatch. */
  code?: string | null;
  /** Text for Unavailable / Compatibility rows. */
  message?: string | null;
  /** Compatibility rows: true when the policy is Block (saving will be refused). */
  blocking?: boolean;
}

export type ScheduleConflictKind = 'Overlap' | 'Unavailable' | 'Compatibility';

// ---- Open shifts / offers / suggestions (Scheduling suite) ----

export type ShiftOfferStatus = 'Offered' | 'Interested' | 'Declined' | 'Assigned' | 'Withdrawn' | 'Expired';

export interface ShiftOffer {
  offerId: number;
  scheduleId: number;
  userId: number;
  fullName?: string | null;
  status: ShiftOfferStatus;
  offeredOn?: string | null;
  respondedOn?: string | null;
  note?: string | null;
  /** GET/POST {id}/offers only (null when the visit has no client). */
  score?: number | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  offeredByName?: string | null;
}

export interface OpenShift {
  scheduleId: number;
  title: string;
  clientId?: number | null;
  clientName?: string | null;
  customerName?: string | null;
  location?: string | null;
  serviceTypeId?: number | null;
  serviceTypeName?: string | null;
  startUtc: string;
  endUtc: string;
  payRatePerHour?: number | null;
  seriesId?: number | null;
  createdOn?: string | null;
  offerCount: number;
  interestedCount: number;
  declinedCount: number;
  /** Caregiver view only, else null. */
  myOffer?: ShiftOffer | null;
  offers?: ShiftOffer[];
}

export interface OfferResponseRequest {
  interested: boolean;
  note?: string | null;
}

export interface SuggestionFactor {
  name: string;
  points: number;
  max: number;
  reason?: string | null;
}

export interface CaregiverSuggestion {
  userId: number;
  fullName: string;
  score: number;
  excluded: boolean;
  excludedReasons: string[];
  factors: SuggestionFactor[];
  warnings: string[];
  distanceKm?: number | null;
}

export interface SuggestionRequest {
  clientId: number;
  serviceTypeId?: number | null;
  startUtc: string;
  endUtc: string;
  scheduleId?: number | null;
}

export interface FillProposal {
  scheduleId: number;
  title: string;
  clientName?: string | null;
  startUtc: string;
  endUtc: string;
  userId?: number | null;
  fullName?: string | null;
  score?: number | null;
  reason?: string | null;
}

export interface FillApplyResult {
  assigned: number;
  failed: { scheduleId: number; userId: number; message: string }[];
}

export interface PendingConfirmation {
  scheduleId: number;
  title: string;
  clientId?: number | null;
  clientName?: string | null;
  location?: string | null;
  serviceTypeName?: string | null;
  startUtc: string;
  endUtc: string;
  assignedUserId: number;
  caregiverName: string;
  caregiverPhone?: string | null;
  caregiverEmail?: string | null;
  confirmationReminderSentOn?: string | null;
}

export interface RemindResult {
  sent: number;
  skipped: number[];
}

/** "2026-12-07T09:00:00" → "9:00 AM" without any time zone conversion. */
export function wallTime(value: string | null | undefined): string {
  const m = /T(\d{2}):(\d{2})/.exec(value ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "2026-12-07T09:00:00" or "2026-12-07" → "Mon, Dec 7" without any time zone conversion. */
export function wallDate(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Mon, Dec 7 · 9:00 AM – 11:00 AM" for a wall-clock visit. */
export function wallRange(start: string | null | undefined, end: string | null | undefined): string {
  return `${wallDate(start)} · ${wallTime(start)} – ${wallTime(end)}`;
}

/** Today (+ offset days) in the browser's local time as 'yyyy-MM-dd'. */
export function localDateOnly(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Adds days to a 'yyyy-MM-dd' string (no time zones involved). */
export function addDaysDateOnly(date: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
