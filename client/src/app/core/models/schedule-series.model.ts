/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Master (recurring) schedules — `api/schedule-series`.
 * Dates are 'yyyy-MM-dd', slot times 'HH:mm', occurrence times are wall-clock
 * 'yyyy-MM-ddTHH:mm:00' (no time zone conversion anywhere).
 */

export type SeriesPattern = 'Weekly' | 'BiWeekly' | 'Monthly';
export type SeriesStatus = 'Active' | 'Paused' | 'Ended';
export type OccurrenceState = 'New' | 'Warning' | 'OpenShift' | 'Conflict' | 'Published';

export const SERIES_PATTERNS: { value: SeriesPattern; label: string }[] = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'BiWeekly', label: 'Bi-weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

/** 0 = Sunday … 6 = Saturday (the API's numbering). */
export const DAYS_OF_WEEK: { value: number; short: string; long: string }[] = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];

export const MONTH_WEEK_NUMBERS: { value: number; label: string }[] = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: 'Last' },
];

export interface SeriesSlot {
  seriesSlotId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  weekNo: number | null;
  monthDay: number | null;
  monthWeekNo: number | null;
  assignedUserId: number | null;
  assignedUserName?: string | null;
  label?: string | null;
}

export interface AppliedToPublished {
  updated: number;
  removed: number;
  cancelled: number;
}

export interface ScheduleSeries {
  seriesId: number;
  clientId: number;
  clientName: string;
  serviceTypeId: number | null;
  serviceTypeName: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  title: string;
  pattern: SeriesPattern;
  startDate: string;
  endDate: string | null;
  payRatePerHour: number | null;
  billRatePerHour: number | null;
  autoPublishWeeksAhead: number;
  status: SeriesStatus;
  notes: string | null;
  lastPublishedThrough: string | null;
  nextVisitDate?: string | null;
  slotCount: number;
  publishedVisitCount?: number | null;
  createdOn?: string | null;
  updatedOn?: string | null;
  slots: SeriesSlot[];
  appliedToPublished?: AppliedToPublished | null;
}

export interface SaveSeriesRequest {
  clientId: number;
  serviceTypeId: number | null;
  assignedUserId: number | null;
  title: string;
  pattern: SeriesPattern;
  startDate: string;
  endDate: string | null;
  payRatePerHour: number | null;
  billRatePerHour: number | null;
  autoPublishWeeksAhead: number;
  notes: string | null;
  slots: Omit<SeriesSlot, 'assignedUserName' | 'label'>[];
  /** PUT only; null = published visits are left alone. */
  applyToPublishedFrom?: string | null;
}

export interface SeriesStatusRequest {
  status: SeriesStatus;
  endDate?: string | null;
  removeFutureVisits: boolean;
}

export interface SeriesListQuery {
  page?: number;
  pageSize?: number;
  clientId?: number | null;
  status?: SeriesStatus | 'All' | '';
  search?: string;
}

export interface PublishRequest {
  from: string;
  to: string;
  seriesIds: number[] | null;
  clientId: number | null;
  openShiftOnCaregiverConflict: boolean;
}

export interface SeriesOccurrence {
  seriesId: number;
  seriesTitle: string;
  clientId: number;
  clientName: string;
  seriesSlotId: number;
  date: string;
  startUtc: string;
  endUtc: string;
  caregiverId: number | null;
  caregiverName: string | null;
  state: OccurrenceState;
  scheduleId: number | null;
  issues: string[];
}

export interface SeriesPreview {
  occurrences: SeriesOccurrence[];
  newCount: number;
  publishedCount: number;
  conflictCount: number;
}

export interface PublishResult {
  created: number;
  createdAsOpenShift: number;
  alreadyPublished: number;
  skipped: SeriesOccurrence[];
  warnings: SeriesOccurrence[];
}

export function patternLabel(p: SeriesPattern | string | null | undefined): string {
  return SERIES_PATTERNS.find((x) => x.value === p)?.label ?? p ?? '—';
}

export function dayShort(dow: number): string {
  return DAYS_OF_WEEK.find((d) => d.value === dow)?.short ?? '?';
}

/** "Mon 09:00–11:00", "Wk 2 Tue 09:00–11:00", "Day 15 09:00–11:00", "2nd Tue 09:00–11:00". */
export function slotLabel(pattern: SeriesPattern, s: SeriesSlot): string {
  const time = `${s.startTime}–${s.endTime}`;
  if (pattern === 'Monthly') {
    if (s.monthDay != null) return `Day ${s.monthDay} ${time}`;
    const nth = MONTH_WEEK_NUMBERS.find((n) => n.value === s.monthWeekNo)?.label ?? '';
    return `${nth} ${dayShort(s.dayOfWeek)} ${time}`.trim();
  }
  if (pattern === 'BiWeekly' && s.weekNo) return `Wk ${s.weekNo} ${dayShort(s.dayOfWeek)} ${time}`;
  return `${dayShort(s.dayOfWeek)} ${time}`;
}

export function seriesStatusClass(s: SeriesStatus | string | null | undefined): string {
  switch (s) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700';
    case 'Paused':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
}

export function occurrenceStateClass(s: OccurrenceState | string): string {
  switch (s) {
    case 'New':
      return 'bg-emerald-50 text-emerald-700';
    case 'Published':
      return 'bg-slate-100 text-slate-600';
    case 'Warning':
      return 'bg-amber-50 text-amber-700';
    case 'OpenShift':
      return 'bg-sky-50 text-sky-700';
    default:
      return 'bg-red-50 text-red-700';
  }
}

export function occurrenceStateLabel(s: OccurrenceState | string): string {
  return s === 'OpenShift' ? 'Open shift' : s;
}
