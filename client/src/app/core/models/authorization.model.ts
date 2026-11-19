/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Payer authorizations: how many hours a payer (with the "Authorization"
 * payment distribution) covers for a client and service type over a period.
 * Date-only values are 'yyyy-MM-dd' strings; never parse them with new Date().
 */

export type AuthorizationAccessLevel = 'None' | 'Read' | 'Write';
export type AuthorizationStatus = 'Active' | 'Inactive';
export type DisplayStatus = 'Active' | 'Upcoming' | 'ExpiringSoon' | 'Expired' | 'Inactive';
export type WeekdayCode = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type AuthorizationLimitPolicy = 'Allow' | 'Warn' | 'Block';

export const WEEKDAY_CODES: { value: WeekdayCode; label: string }[] = [
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
  { value: 'Sat', label: 'Sat' },
  { value: 'Sun', label: 'Sun' },
];

export const DISPLAY_STATUSES: { value: DisplayStatus; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'ExpiringSoon', label: 'Expiring soon' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Inactive', label: 'Inactive' },
];

export const AUTHORIZATION_POLICIES: { value: AuthorizationLimitPolicy; label: string }[] = [
  { value: 'Allow', label: 'Allow' },
  { value: 'Warn', label: 'Warn (show warnings)' },
  { value: 'Block', label: 'Block (reject the visit)' },
];

export function displayStatusLabel(s: DisplayStatus | string | null | undefined): string {
  return DISPLAY_STATUSES.find((x) => x.value === s)?.label ?? s ?? '—';
}

/** Pill colours: Active green, Expiring soon amber, Expired orange, Upcoming blue, Inactive grey. */
export function displayStatusClass(s: DisplayStatus | string | null | undefined): string {
  switch (s) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700';
    case 'ExpiringSoon':
      return 'bg-amber-50 text-amber-700';
    case 'Expired':
      return 'bg-orange-50 text-orange-700';
    case 'Upcoming':
      return 'bg-sky-50 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
}

/** 'yyyy-MM-dd' (or an ISO date-time) → 'MM/dd/yyyy' without any timezone conversion. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : value;
}

/** Today in the browser's local time as 'yyyy-MM-dd'. */
export function todayDateOnly(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Client-side status for the form: same rules as the server's display status. */
export function calculateDisplayStatus(
  status: AuthorizationStatus,
  startDate: string,
  endDate: string,
): DisplayStatus | null {
  if (status === 'Inactive') return 'Inactive';
  if (!startDate || !endDate) return null;
  const today = todayDateOnly();
  if (startDate > today) return 'Upcoming';
  if (endDate < today) return 'Expired';
  if (endDate <= todayDateOnly(30)) return 'ExpiringSoon';
  return 'Active';
}

/** "6.00 h" or "No limit". */
export function formatHours(h: number | null | undefined, empty = 'No limit'): string {
  return h == null ? empty : `${h.toFixed(2)} h`;
}

/** "Mon–Fri", "Mon, Wed, Fri", "Every day". */
export function allowedDaysLabel(days: string[] | null | undefined): string {
  const order = WEEKDAY_CODES.map((d) => d.value as string);
  const list = (days ?? [])
    .filter((d) => order.includes(d))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (list.length === 7) return 'Every day';
  if (list.length === 0) return '—';
  const idx = list.map((d) => order.indexOf(d));
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  return contiguous && list.length > 2 ? `${list[0]}–${list[list.length - 1]}` : list.join(', ');
}

export interface AuthorizationAccess {
  roleName: string;
  accessLevel: AuthorizationAccessLevel;
  canView: boolean;
  canManage: boolean;
  canManageSettings: boolean;
}

export interface Authorization {
  authorizationId: number;
  clientId: number;
  clientName: string;
  payerId: number;
  payerName: string;
  serviceTypeId: number;
  serviceTypeName: string;
  authorizationName: string;
  authorizationNumber: string | null;
  startDate: string;
  endDate: string;
  maxHoursPerDay: number | null;
  maxHoursPerWeek: number | null;
  maxHoursPerMonth: number | null;
  totalAuthorizedHours: number | null;
  allowedDays: WeekdayCode[];
  status: AuthorizationStatus;
  displayStatus: DisplayStatus;
  daysLeft: number;
  usedHours: number;
  notes: string | null;
  createdOn: string;
  updatedOn: string | null;
}

export interface AuthorizationListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  clientId?: number | null;
  payerId?: number | null;
  serviceTypeId?: number | null;
  status?: DisplayStatus | '' | null;
}

export interface AuthorizationSummary {
  total: number;
  active: number;
  upcoming: number;
  expiringSoon: number;
  expired: number;
  inactive: number;
}

export interface AuthorizationUsage {
  label: string;
  from: string;
  to: string;
  limitHours: number | null;
  usedHours: number;
  remainingHours: number | null;
}

export interface AuthorizationDetail {
  authorization: Authorization;
  usage: AuthorizationUsage[];
  visitCount: number;
}

export interface AuthorizationVisit {
  scheduleId: number;
  title: string;
  startUtc: string;
  endUtc: string;
  status: string;
  caregiverName: string | null;
  serviceDate: string;
  hours: number;
  basis: string | null;
  isInvoiced: boolean;
}

export interface AuthorizationFormPayer {
  clientPayerId: number;
  payerId: number;
  payerName: string;
  payerType: string;
  payerStatus: string;
  rank: number | null;
  paymentDistribution: string;
  isAuthorizationPayer: boolean;
}

export interface AuthorizationFormServiceType {
  serviceTypeId: number;
  name: string;
  isClientService: boolean;
}

export interface AuthorizationFormOptions {
  payers: AuthorizationFormPayer[];
  serviceTypes: AuthorizationFormServiceType[];
}

export interface SaveAuthorizationRequest {
  clientId: number;
  payerId: number;
  serviceTypeId: number;
  authorizationName: string;
  authorizationNumber: string | null;
  startDate: string;
  endDate: string;
  maxHoursPerDay: number | null;
  maxHoursPerWeek: number | null;
  maxHoursPerMonth: number | null;
  totalAuthorizedHours: number | null;
  allowedDays: string[];
  notes: string | null;
}

// ------------------------------------------------------------ Scheduling (P2)

export interface AllocationPreviewRequest {
  scheduleId?: number | null;
  clientId: number;
  serviceTypeId?: number | null;
  startUtc: string;
  endUtc: string;
}

export interface AllocationShare {
  sequence: number;
  billToType: 'Payer' | 'Client';
  payerId: number | null;
  billToName: string;
  authorizationId: number | null;
  authorizationName: string | null;
  authorizationNumber: string | null;
  minutes: number;
  hours: number;
  basis: string | null;
}

export interface AllocationWarning {
  code: string;
  message: string;
  payerId: number | null;
  authorizationId: number | null;
}

export interface AllocationPreview {
  totalHours: number;
  shares: AllocationShare[];
  warnings: AllocationWarning[];
  hasAuthorizationPayers: boolean;
  exceedsAuthorization: boolean;
  policy: AuthorizationLimitPolicy;
  wouldBlock: boolean;
}
