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
}

export interface SchedulingSettings {
  adminAccess: AccessLevel;
  managerAccess: AccessLevel;
  defaultPayRatePerHour: number;
  defaultOvertimeMultiplier: number;
  notifyAdminOnCreate: boolean;
  notifyManagerOnCreate: boolean;
  autoClockEnabled: boolean;
  updatedOn: string;
}

export interface UpdateSchedulingAccess {
  adminAccess: AccessLevel;
  managerAccess: AccessLevel;
}

export interface UpdateSchedulingDefaults {
  defaultPayRatePerHour: number;
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
  assignedUserId: number;
  assignedUserName: string;
  startUtc: string;
  endUtc: string;
  payRatePerHour: number;
  overtimeMultiplier: number;
  status: ScheduleStatus;
  rejectionReason?: string | null;
  colorTag?: string | null;
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
  assignedUserId: number;
  startUtc: string;
  endUtc: string;
  payRatePerHour: number;
  overtimeMultiplier: number;
  colorTag?: string | null;
  notifyAdmin: boolean;
  notifyManager: boolean;
}

export interface UpdateScheduleRequest {
  title: string;
  customerName?: string | null;
  location?: string | null;
  clientId?: number | null;
  serviceTypeId?: number | null;
  assignedUserId: number;
  startUtc: string;
  endUtc: string;
  payRatePerHour: number;
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
