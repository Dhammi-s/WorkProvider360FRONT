/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Missed clock-ins / clock-outs — `api/visit-exceptions`. Visit times are wall clock. */

export type VisitExceptionType = 'MissedClockIn' | 'MissedClockOut';
export type VisitExceptionStatus = 'Open' | 'Resolved' | 'Dismissed';
export type VisitExceptionResolution = 'ClockedLate' | 'TimeAdded' | 'NoShow' | 'Dismissed';
export type ResolveAction = 'AddTime' | 'NoShow' | 'Dismiss';

export interface VisitException {
  exceptionId: number;
  scheduleId: number;
  exceptionType: VisitExceptionType;
  status: VisitExceptionStatus;
  detectedOn: string;
  notifiedOn: string | null;
  resolvedOn: string | null;
  resolvedByName: string | null;
  resolution: VisitExceptionResolution | null;
  lateMinutes: number | null;
  note: string | null;
  title: string;
  startUtc: string;
  endUtc: string;
  scheduleStatus: string;
  clientId: number | null;
  clientName: string | null;
  assignedUserId: number | null;
  caregiverName: string | null;
  caregiverPhone: string | null;
}

export interface VisitExceptionQuery {
  page?: number;
  pageSize?: number;
  status?: VisitExceptionStatus | 'All' | '';
  type?: VisitExceptionType | '';
  from?: string;
  to?: string;
  userId?: number | null;
}

export interface ResolveVisitException {
  action: ResolveAction;
  clockInUtc?: string | null;
  clockOutUtc?: string | null;
  note?: string | null;
}

export function exceptionTypeLabel(t: VisitExceptionType | string): string {
  return t === 'MissedClockOut' ? 'Missed clock-out' : 'Missed clock-in';
}

export function resolutionLabel(r: VisitExceptionResolution | string | null): string {
  switch (r) {
    case 'ClockedLate':
      return 'Clocked in late';
    case 'TimeAdded':
      return 'Time added';
    case 'NoShow':
      return 'No-show';
    case 'Dismissed':
      return 'Dismissed';
    default:
      return '—';
  }
}
