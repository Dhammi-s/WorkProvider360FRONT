/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { AllocationPreview, AllocationPreviewRequest, AllocationShare } from '../../../core/models/authorization.model';
import { UserDto } from '../../../core/models/user.model';
import {
  ClockRequest,
  Schedule,
  ScheduleDetail,
  ScheduleStatus,
  SchedulingAccess,
  TimeEntrySignature,
  CareLogEntry,
  ScheduleConflict,
  InitialScheduleStatus,
} from '../../../core/models/scheduler.model';
import { Client, ClientSettings, EligibleCaregiver } from '../../../core/models/client.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { ClientService } from '../../../core/services/client.service';
import { ServiceTypeService } from '../../../core/services/service-type.service';
import { ClientPayerService } from '../../../core/services/ClientPayerService';
import { ResolvedRates } from '../../../core/models/payer.model';
import { SignaturePad } from '../../../shared/ui/signature-pad/signature-pad';
import { AuthService } from '../../../core/services/auth.service';
import { LocationTrackingService } from '../../../core/services/location-tracking.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { CareLog } from '../../../shared/ui/care-log/care-log';
import { StarRating } from '../../../shared/ui/star-rating/star-rating';
import { FeedbackService } from '../../../core/services/feedback.service';
import { VisitFeedback } from '../../../core/models/feedback.model';
import { apiErrorLines } from '../../../core/models/api-response.model';
import { SeriesPattern } from '../../../core/models/schedule-series.model';
import { addDaysDateOnly, localDateOnly } from '../../../core/models/scheduler.model';
import { ScheduleSeriesService } from '../../../core/services/schedule-series.service';
import { ToastService } from '../../../core/services/toast.service';
import { CaregiverSuggestions } from '../../../shared/ui/caregiver-suggestions/caregiver-suggestions';

type RepeatMode = 'None' | SeriesPattern;

/** Weekday buttons of the Repeat section (0 = Sunday, the API's numbering). */
const REPEAT_DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

/** Tech filter key for open shifts (no caregiver yet). */
const OPEN_KEY = -1;
const OPEN_COLOR = {
  dot: 'bg-sky-400',
  text: 'text-sky-700',
  ring: 'ring-sky-300',
  bar: 'border-l-sky-400 bg-white border border-dashed border-sky-300',
};

type CalView = 'week' | 'day' | 'month';

interface Tech {
  userId: number;
  name: string;
  color: ReturnType<typeof colorFor>;
}

interface PositionedBlock {
  schedule: Schedule;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}

const PALETTE = [
  { dot: 'bg-indigo-500', text: 'text-indigo-700', ring: 'ring-indigo-300', bar: 'border-l-indigo-500 bg-indigo-50' },
  { dot: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-300', bar: 'border-l-emerald-500 bg-emerald-50' },
  { dot: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-300', bar: 'border-l-amber-500 bg-amber-50' },
  { dot: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-300', bar: 'border-l-rose-500 bg-rose-50' },
  { dot: 'bg-sky-500', text: 'text-sky-700', ring: 'ring-sky-300', bar: 'border-l-sky-500 bg-sky-50' },
  { dot: 'bg-violet-500', text: 'text-violet-700', ring: 'ring-violet-300', bar: 'border-l-violet-500 bg-violet-50' },
  { dot: 'bg-teal-500', text: 'text-teal-700', ring: 'ring-teal-300', bar: 'border-l-teal-500 bg-teal-50' },
  { dot: 'bg-fuchsia-500', text: 'text-fuchsia-700', ring: 'ring-fuchsia-300', bar: 'border-l-fuchsia-500 bg-fuchsia-50' },
];

function colorFor(userId: number | null) {
  if (userId == null || userId === OPEN_KEY) return OPEN_COLOR;
  return PALETTE[Math.abs(userId) % PALETTE.length];
}

/** Parse a backend UTC/naive datetime string as local wall-clock. */
function parseLocal(s: string): Date {
  return new Date((s || '').replace('Z', '').replace(/[+-]\d\d:\d\d$/, ''));
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const day = (r.getDay() + 6) % 7; // Monday = 0
  return addDays(r, -day);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_PX = 56;

@Component({
  selector: 'app-scheduler',
  imports: [FormsModule, DatePipe, DecimalPipe, Alert, SignaturePad, CareLog, StarRating, CaregiverSuggestions],
  templateUrl: './scheduler.html',
})
export class Scheduler {
  private readonly service = inject(SchedulerService);
  private readonly feedbackApi = inject(FeedbackService);
  private readonly auth = inject(AuthService);
  private readonly clients = inject(ClientService);
  private readonly serviceTypeService = inject(ServiceTypeService);
  private readonly payerService = inject(ClientPayerService);
  private readonly seriesService = inject(ScheduleSeriesService);
  private readonly toast = inject(ToastService);
  readonly locationTracking = inject(LocationTrackingService);

  readonly myUserId = this.auth.user()?.userId ?? 0;

  // Layout constants exposed to the template.
  readonly startHour = START_HOUR;
  readonly hourPx = HOUR_PX;
  readonly hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  readonly gridHeight = (END_HOUR - START_HOUR) * HOUR_PX;

  readonly access = signal<SchedulingAccess | null>(null);
  readonly view = signal<CalView>('week');
  readonly anchor = signal<Date>(startOfDay(new Date()));
  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly techFilter = signal<Set<number>>(new Set());

  // Assignee list for the create/edit form.
  readonly assignableUsers = signal<UserDto[]>([]);

  // Create / edit modal state.
  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly formBusy = signal(false);
  readonly formError = signal('');
  /** errors[] of a refused save (e.g. 409 compatibility / authorization issues). */
  readonly formErrorDetails = signal<string[]>([]);
  readonly schedConflicts = signal<ScheduleConflict[] | null>(null);
  /** Overlapping visits in the conflict box. */
  readonly overlapConflicts = computed(() => (this.schedConflicts() ?? []).filter((c) => !c.kind || c.kind === 'Overlap'));
  /** Unavailable / Compatibility rows in the conflict box. */
  readonly otherConflicts = computed(() => (this.schedConflicts() ?? []).filter((c) => !!c.kind && c.kind !== 'Overlap'));
  /** A Compatibility row under the Block policy: saving would be refused. */
  readonly blockingConflict = computed(() => (this.schedConflicts() ?? []).some((c) => !!c.blocking));
  // Open shift + repeat (create) + suggestions drawer.
  readonly fOpenShift = signal(false);
  readonly fRepeat = signal<RepeatMode>('None');
  readonly fRepeatDays = signal<Set<number>>(new Set());
  readonly fRepeatUntil = signal('');
  readonly repeatDays = REPEAT_DAYS;
  readonly suggestOpen = signal(false);
  readonly fTitle = signal('');
  readonly fCustomer = signal('');
  readonly fLocation = signal('');
  readonly fAssignee = signal<number | null>(null);
  readonly fDate = signal('');
  readonly fStart = signal('09:00');
  readonly fEnd = signal('17:00');
  readonly fRate = signal(0);
  readonly fStatus = signal<InitialScheduleStatus>('Scheduled');
  readonly fBillRate = signal(0);
  /** Client -> primary -> secondary -> other payers -> agency defaults, for the picked client. */
  readonly fResolvedRates = signal<ResolvedRates | null>(null);
  /** Names of the missing rates while the rate-conflict box is open. */
  readonly rateConflict = signal<string[] | null>(null);
  private ratesAcknowledged = false;
  readonly fOt = signal(1.5);
  readonly fNotifyAdmin = signal(false);
  readonly fNotifyManager = signal(false);
  readonly fClientId = signal<number | null>(null);
  readonly fServiceTypeId = signal<number | null>(null);
  readonly clientQuery = signal('');
  readonly clientOptions = signal<Client[]>([]);
  readonly clientPickerOpen = signal(false);
  readonly serviceTypes = signal<ServiceType[]>([]);
  readonly eligible = signal<EligibleCaregiver[] | null>(null);
  readonly clientSettings = signal<ClientSettings | null>(null);

  // Clock + signature flow.
  readonly clockPhase = signal<'ClockIn' | 'ClockOut' | null>(null);
  readonly pendingCoords = signal<{ latitude: number; longitude: number } | null>(null);
  readonly sigOpen = signal(false);
  readonly sigData = signal<string | null>(null);
  readonly sigName = signal('');
  readonly sigError = signal('');
  readonly sigRequired = signal(false);
  readonly sigView = signal<TimeEntrySignature[] | null>(null);
  readonly careLogEntries = signal<CareLogEntry[]>([]);
  readonly careLogOpen = signal(false);

  // Detail modal state.
  readonly detail = signal<ScheduleDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailTab = signal<'details' | 'feedback'>('details');
  readonly scheduleFeedback = signal<VisitFeedback | null>(null);
  readonly feedbackLoaded = signal(false);
  readonly detailError = signal('');
  readonly actionBusy = signal(false);
  readonly actionNotice = signal('');
  readonly rejecting = signal(false);
  readonly rejectReason = signal('');
  readonly noteText = signal('');
  readonly noteIsInjury = signal(false);
  readonly manualDate = signal('');
  readonly manualStart = signal('09:00');
  readonly manualEnd = signal('17:00');
  readonly showManual = signal(false);

  // Payer coverage (authorization preview) for the create / edit form.
  readonly coverage = signal<AllocationPreview | null>(null);
  readonly coverageLoading = signal(false);
  /** Server message when saving was rejected over an authorization (Block policy). */
  readonly coverageSaveError = signal('');
  private readonly preview$ = new Subject<AllocationPreviewRequest | null>();
  /** Hidden for clients without Authorization payers and a single bill-to (they look unchanged). */
  readonly showCoverage = computed(() => {
    const c = this.coverage();
    return this.formOpen() && this.fClientId() != null && !!c && (c.hasAuthorizationPayers || c.shares.length > 1);
  });
  readonly coverageBlocked = computed(() => this.showCoverage() && !!this.coverage()?.wouldBlock);

  constructor() {
    this.loadAccess();
    this.serviceTypeService.active().subscribe({ next: (s) => this.serviceTypes.set(s), error: () => {} });
    this.clients.getSettings().subscribe({ next: (s) => this.clientSettings.set(s), error: () => {} });

    // Coverage preview: 400 ms after the client, service type, date or times change.
    this.preview$
      .pipe(
        debounceTime(400),
        switchMap((req) =>
          req ? this.service.previewAllocation(req).pipe(catchError(() => of(null))) : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((p) => {
        this.coverage.set(p);
        this.coverageLoading.set(false);
      });
    effect(() => {
      const open = this.formOpen();
      const clientId = this.fClientId();
      const serviceTypeId = this.fServiceTypeId();
      const date = this.fDate();
      const start = this.fStart();
      const end = this.fEnd();
      untracked(() => {
        this.coverageSaveError.set('');
        const startUtc = `${date}T${start}:00`;
        const endUtc = `${date}T${end}:00`;
        if (!open || clientId == null || !date || !start || !end || endUtc <= startUtc) {
          this.coverage.set(null);
          this.coverageLoading.set(false);
          this.preview$.next(null);
          return;
        }
        this.coverageLoading.set(true);
        this.preview$.next({
          scheduleId: this.editingId() ?? undefined,
          clientId,
          serviceTypeId: serviceTypeId ?? undefined,
          startUtc,
          endUtc,
        });
      });
    });
  }

  /** "Medicaid · Personal Care 2025" or "Client (private pay)". */
  shareLabel(s: AllocationShare): string {
    if (s.billToType === 'Client') return `${s.billToName || 'Client'} (private pay)`;
    return s.authorizationName ? `${s.billToName} · ${s.authorizationName}` : s.billToName;
  }

  // ----------------------------------------------------------------- Loading

  private loadAccess(): void {
    this.service.getAccess().subscribe({
      next: (a) => {
        this.access.set(a);
        if (a.canManage) this.loadAssignable();
        this.load();
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load scheduler access.');
        this.loading.set(false);
      },
    });
  }

  private loadAssignable(): void {
    this.service.assignableUsers().subscribe({
      next: (u) => this.assignableUsers.set(u),
      error: () => this.assignableUsers.set([]),
    });
  }

  load(): void {
    const a = this.access();
    if (a && a.accessLevel === 'None') {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { from, to } = this.range();
    this.service.list(from, to).subscribe({
      next: (rows) => {
        this.schedules.set(rows);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load schedules.');
        this.loading.set(false);
      },
    });
  }

  /** UTC-naive range strings for the current view. */
  private range(): { from: string; to: string } {
    const v = this.view();
    const anchor = this.anchor();
    let from: Date;
    let to: Date;
    if (v === 'day') {
      from = startOfDay(anchor);
      to = addDays(from, 1);
    } else if (v === 'week') {
      from = startOfWeek(anchor);
      to = addDays(from, 7);
    } else {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      from = startOfWeek(first);
      to = addDays(from, 42);
    }
    return { from: this.toNaive(from), to: this.toNaive(to) };
  }

  private toNaive(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  // ------------------------------------------------------------- Navigation

  setView(v: CalView): void {
    this.view.set(v);
    this.load();
  }

  today(): void {
    this.anchor.set(startOfDay(new Date()));
    this.load();
  }

  prev(): void {
    this.shift(-1);
  }
  next(): void {
    this.shift(1);
  }
  private shift(dir: number): void {
    const v = this.view();
    const a = this.anchor();
    if (v === 'day') this.anchor.set(addDays(a, dir));
    else if (v === 'week') this.anchor.set(addDays(a, dir * 7));
    else this.anchor.set(new Date(a.getFullYear(), a.getMonth() + dir, 1));
    this.load();
  }

  readonly periodLabel = computed(() => {
    const v = this.view();
    const a = this.anchor();
    if (v === 'day') return a.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (v === 'month') return a.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const s = startOfWeek(a);
    const e = addDays(s, 6);
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  });

  // ------------------------------------------------------------------ Techs

  readonly techs = computed<Tech[]>(() => {
    const map = new Map<number, Tech>();
    for (const s of this.schedules()) {
      const key = s.assignedUserId ?? OPEN_KEY;
      if (!map.has(key)) {
        map.set(key, { userId: key, name: s.assignedUserId == null ? 'Open shifts' : s.assignedUserName, color: colorFor(key) });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  toggleTech(userId: number): void {
    const set = new Set(this.techFilter());
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    this.techFilter.set(set);
  }

  isTechActive(userId: number): boolean {
    const f = this.techFilter();
    return f.size === 0 || f.has(userId);
  }

  readonly visible = computed<Schedule[]>(() => {
    const f = this.techFilter();
    const rows = this.schedules();
    return f.size === 0 ? rows : rows.filter((s) => f.has(s.assignedUserId ?? OPEN_KEY));
  });

  colorFor = colorFor;

  // -------------------------------------------------------------- Time grid

  readonly weekDays = computed<Date[]>(() => {
    const s = startOfWeek(this.anchor());
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  });

  isToday(d: Date): boolean {
    return sameDay(d, new Date());
  }

  /** Position events that START on the given day, splitting overlaps into lanes. */
  blocksForDay(day: Date): PositionedBlock[] {
    const evs = this.visible()
      .filter((s) => sameDay(parseLocal(s.startUtc), day))
      .map((s) => {
        const start = parseLocal(s.startUtc);
        const end = parseLocal(s.endUtc);
        const startMin = Math.max(START_HOUR * 60, start.getHours() * 60 + start.getMinutes());
        const endMin = Math.min(END_HOUR * 60, Math.max(startMin + 30, end.getHours() * 60 + end.getMinutes() || END_HOUR * 60));
        return { s, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const blocks: PositionedBlock[] = [];
    // Cluster by overlap, then lane within cluster.
    let i = 0;
    while (i < evs.length) {
      let j = i;
      let clusterEnd = evs[i].endMin;
      const cluster = [evs[i]];
      j++;
      while (j < evs.length && evs[j].startMin < clusterEnd) {
        cluster.push(evs[j]);
        clusterEnd = Math.max(clusterEnd, evs[j].endMin);
        j++;
      }
      const laneEnds: number[] = [];
      const laneOf = new Map<number, number>();
      cluster.forEach((ev, idx) => {
        let lane = laneEnds.findIndex((e) => e <= ev.startMin);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(ev.endMin);
        } else {
          laneEnds[lane] = ev.endMin;
        }
        laneOf.set(idx, lane);
      });
      const laneCount = laneEnds.length;
      cluster.forEach((ev, idx) => {
        const lane = laneOf.get(idx) ?? 0;
        blocks.push({
          schedule: ev.s,
          top: ((ev.startMin - START_HOUR * 60) / 60) * HOUR_PX,
          height: Math.max(24, ((ev.endMin - ev.startMin) / 60) * HOUR_PX - 2),
          widthPct: 100 / laneCount,
          leftPct: (lane * 100) / laneCount,
        });
      });
      i = j;
    }
    return blocks;
  }

  // Month view helpers
  readonly monthWeeks = computed<Date[][]>(() => {
    const first = new Date(this.anchor().getFullYear(), this.anchor().getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  });

  schedulesOn(day: Date): Schedule[] {
    return this.visible()
      .filter((s) => sameDay(parseLocal(s.startUtc), day))
      .sort((a, b) => parseLocal(a.startUtc).getTime() - parseLocal(b.startUtc).getTime());
  }

  inCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.anchor().getMonth();
  }

  timeLabel(s: string): string {
    const d = parseLocal(s);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  hourLabel(h: number): string {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  }

  statusBadge(status: ScheduleStatus | string): string {
    switch (status) {
      case 'Accepted':
        return 'bg-emerald-50 text-emerald-700';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-50 text-red-700';
      case 'InProgress':
        return 'bg-sky-50 text-sky-700';
      case 'Completed':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  }

  // --------------------------------------------------------- Create / edit

  openCreate(day?: Date): void {
    if (!this.access()?.canManage) return;
    this.editingId.set(null);
    this.formError.set('');
    const base = day ?? this.anchor();
    this.fTitle.set('');
    this.fCustomer.set('');
    this.fLocation.set('');
    this.fAssignee.set(this.assignableUsers()[0]?.userId ?? null);
    this.fDate.set(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`);
    this.fStart.set('09:00');
    this.fEnd.set('17:00');
    this.fRate.set(0);
    this.fStatus.set('Scheduled');
    this.fBillRate.set(0);
    this.fResolvedRates.set(null);
    this.rateConflict.set(null);
    this.ratesAcknowledged = false;
    this.fOt.set(1.5);
    this.fNotifyAdmin.set(false);
    this.fClientId.set(null);
    this.fServiceTypeId.set(null);
    this.clientQuery.set("");
    this.eligible.set(null);
    this.fNotifyManager.set(false);
    this.fOpenShift.set(false);
    this.fRepeat.set('None');
    this.fRepeatDays.set(new Set([base.getDay()]));
    this.fRepeatUntil.set('');
    this.formErrorDetails.set([]);
    this.schedConflicts.set(null);
    // Prime defaults from settings.
    this.service.getSettings().subscribe({
      next: (s) => {
        if (this.editingId() === null && !this.formBusy()) {
          // A client picked meanwhile already has its resolved rates.
          if (!this.fResolvedRates()) {
            this.fRate.set(s.defaultPayRatePerHour);
            this.fBillRate.set(s.defaultBillRatePerHour ?? 0);
          }
          this.fOt.set(s.defaultOvertimeMultiplier);
          this.fNotifyAdmin.set(s.notifyAdminOnCreate);
          this.fNotifyManager.set(s.notifyManagerOnCreate);
        }
      },
      error: () => {},
    });
    this.formOpen.set(true);
  }

  openEdit(s: Schedule): void {
    if (!this.access()?.canManage) return;
    this.editingId.set(s.scheduleId);
    this.formError.set('');
    const start = parseLocal(s.startUtc);
    const end = parseLocal(s.endUtc);
    this.fTitle.set(s.title);
    this.fCustomer.set(s.customerName ?? '');
    this.fLocation.set(s.location ?? '');
    this.fAssignee.set(s.assignedUserId);
    this.fOpenShift.set(!!s.isOpenShift || s.assignedUserId == null);
    this.fRepeat.set('None');
    this.formErrorDetails.set([]);
    this.schedConflicts.set(null);
    this.fDate.set(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
    this.fStart.set(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    this.fEnd.set(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
    this.fRate.set(s.payRatePerHour);
    this.fBillRate.set(s.billRatePerHour ?? 0);
    this.fResolvedRates.set(null);
    this.rateConflict.set(null);
    this.ratesAcknowledged = true;
    this.fOt.set(s.overtimeMultiplier);
    this.fClientId.set(s.clientId ?? null);
    this.fServiceTypeId.set(s.serviceTypeId ?? null);
    this.clientQuery.set(s.clientName ?? "");
    this.eligible.set(null);
    if (s.clientId != null) this.loadEligible();
    this.detail.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  saveForm(): void {
    if (this.coverageBlocked()) {
      this.formError.set('This visit exceeds the payer authorization and the agency policy blocks it. Shorten the visit or add an authorization.');
      return;
    }
    if (!this.fTitle().trim()) {
      this.formError.set('Title is required.');
      return;
    }
    this.formErrorDetails.set([]);
    if (!this.fOpenShift() && this.fAssignee() == null) {
      this.formError.set('Please choose who to assign, or make it an open shift.');
      return;
    }
    const startUtc = `${this.fDate()}T${this.fStart()}:00`;
    const endUtc = `${this.fDate()}T${this.fEnd()}:00`;
    if (endUtc <= startUtc) {
      this.formError.set('End time must be after start time.');
      return;
    }
    if (this.isRepeating()) {
      this.saveAsSeries();
      return;
    }
    // Rate conflict: nothing in the client / payers / defaults chain had a rate.
    const missing = this.missingRates();
    if (!this.ratesAcknowledged && this.fStatus() !== 'Cancelled' && missing.length) {
      this.rateConflict.set(missing);
      return;
    }
    this.formBusy.set(true);
    this.formError.set('');
    // Open shifts have no caregiver to check.
    if (this.fOpenShift()) {
      this.doSaveForm(startUtc, endUtc);
      return;
    }
    // Double-booking, availability and compatibility check before saving; the warning box
    // lets the scheduler save anyway unless a compatibility row is blocking.
    this.service.conflicts(this.fAssignee()!, startUtc, endUtc, this.editingId() ?? undefined, this.fClientId()).subscribe({
      next: (list) => {
        if (list.length) {
          this.schedConflicts.set(list);
          this.formBusy.set(false);
        } else {
          this.doSaveForm(startUtc, endUtc);
        }
      },
      error: () => this.doSaveForm(startUtc, endUtc),
    });
  }

  missingRates(): string[] {
    const missing: string[] = [];
    if (!(Number(this.fBillRate()) > 0)) missing.push('Bill rate');
    if (!(Number(this.fRate()) > 0)) missing.push('Pay rate');
    return missing;
  }

  ignoreRateConflictSave(): void {
    this.ratesAcknowledged = true;
    this.rateConflict.set(null);
    this.saveForm();
  }

  cancelRateConflict(): void {
    this.rateConflict.set(null);
  }

  ignoreConflictsSave(): void {
    if (this.blockingConflict()) return;
    const startUtc = `${this.fDate()}T${this.fStart()}:00`;
    const endUtc = `${this.fDate()}T${this.fEnd()}:00`;
    this.schedConflicts.set(null);
    this.formBusy.set(true);
    this.doSaveForm(startUtc, endUtc);
  }

  cancelConflicts(): void {
    this.schedConflicts.set(null);
    this.formBusy.set(false);
  }

  private doSaveForm(startUtc: string, endUtc: string): void {
    const open = this.fOpenShift();
    const base = {
      title: this.fTitle().trim(),
      customerName: this.fCustomer().trim() || null,
      location: this.fLocation().trim() || null,
      assignedUserId: open ? null : this.fAssignee(),
      isOpenShift: open,
      startUtc,
      endUtc,
      payRatePerHour: Number(this.fRate()) || 0,
      billRatePerHour: Number(this.fBillRate()) || 0,
      overtimeMultiplier: Number(this.fOt()) || 1.5,
      clientId: this.fClientId(),
      serviceTypeId: this.fServiceTypeId(),
      colorTag: null,
    };
    const id = this.editingId();
    const req$ = id
      ? this.service.update(id, base)
      : this.service.create({
          ...base,
          status: open ? 'Scheduled' : this.fStatus(),
          notifyAdmin: this.fNotifyAdmin(),
          notifyManager: this.fNotifyManager(),
          offerToUserIds: open ? null : undefined,
        });
    req$.subscribe({
      next: () => {
        this.formBusy.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err: Error) => {
        // 409 (compatibility / authorization Block): the server message plus its errors[] lines.
        const lines = apiErrorLines(err, 'Could not save the schedule.');
        this.formError.set(lines.message || err.message || 'Could not save the schedule.');
        this.formErrorDetails.set(lines.errors);
        // Over-authorization rejections (Block policy) are also shown in the coverage panel.
        if (this.coverage()?.hasAuthorizationPayers) this.coverageSaveError.set(err.message || '');
        this.formBusy.set(false);
      },
    });
  }

  // ------------------------------------------------------------- Detail

  open(id: number): void {
    this.detailLoading.set(true);
    this.detailError.set('');
    this.actionNotice.set('');
    this.rejecting.set(false);
    this.rejectReason.set('');
    this.noteText.set('');
    this.noteIsInjury.set(false);
    this.showManual.set(false);
    this.detail.set(null);
    this.detailTab.set('details');
    this.scheduleFeedback.set(null);
    this.feedbackLoaded.set(false);
    this.service.detail(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
        this.loadCareLog(id);
      },
      error: (err: Error) => {
        this.detailError.set(err.message || 'Could not load the schedule.');
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.detail.set(null);
  }

  /** Feedback tab: the client's rating of this visit and its caregiver (loaded on first open). */
  showDetailTab(tab: 'details' | 'feedback'): void {
    this.detailTab.set(tab);
    const d = this.detail();
    if (tab !== 'feedback' || !d || this.feedbackLoaded()) return;
    this.feedbackApi.forSchedule(d.schedule.scheduleId).subscribe({
      next: (f) => {
        this.scheduleFeedback.set(f);
        this.feedbackLoaded.set(true);
      },
      error: (err: Error) => {
        this.detailError.set(err.message || 'Could not load the feedback.');
        this.feedbackLoaded.set(true);
      },
    });
  }

  /** Approve / remove approval (only approved schedules are invoiced by default). */
  toggleApproval(s: Schedule): void {
    this.actionBusy.set(true);
    this.detailError.set('');
    this.service.setApproval(s.scheduleId, !s.isApproved).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.reloadDetail();
      },
      error: (err: Error) => {
        this.actionBusy.set(false);
        this.detailError.set(err.message || 'Could not change the approval.');
      },
    });
  }

  private reloadDetail(): void {
    const d = this.detail();
    if (d) this.open(d.schedule.scheduleId);
    this.load();
  }

  isMine(s: Schedule): boolean {
    return s.assignedUserId != null && s.assignedUserId === this.myUserId;
  }

  isOpen(s: Schedule): boolean {
    return !!s.isOpenShift || s.assignedUserId == null;
  }

  // ------------------------------------------------- Open shift / repeat / suggest

  setOpenShift(on: boolean): void {
    this.fOpenShift.set(on);
    if (on) {
      this.fStatus.set('Scheduled');
      this.fAssignee.set(null);
    }
  }

  isRepeating(): boolean {
    return this.editingId() == null && this.fRepeat() !== 'None';
  }

  toggleRepeatDay(d: number): void {
    this.fRepeatDays.update((set) => {
      const next = new Set(set);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  /** Day of month of the picked date (Monthly repeats on that date). */
  repeatMonthDay(): number {
    return Number((this.fDate() || '').slice(8, 10)) || 1;
  }

  openSuggest(): void {
    if (this.fClientId() == null) {
      this.formError.set('Pick a client first: suggestions rank caregivers for that client.');
      return;
    }
    this.suggestOpen.set(true);
  }

  readonly suggestRequest = computed(() => {
    const clientId = this.fClientId();
    if (clientId == null) return null;
    return {
      clientId,
      serviceTypeId: this.fServiceTypeId(),
      startUtc: `${this.fDate()}T${this.fStart()}:00`,
      endUtc: `${this.fDate()}T${this.fEnd()}:00`,
      scheduleId: this.editingId(),
    };
  });

  /** A suggested caregiver missing from the assignable list (so the select can show it). */
  readonly extraAssignee = signal<{ userId: number; fullName: string } | null>(null);

  pickSuggested(p: { userId: number; fullName: string }): void {
    this.suggestOpen.set(false);
    this.fOpenShift.set(false);
    this.extraAssignee.set(this.assignableUsers().some((u) => u.userId === p.userId) ? null : p);
    this.fAssignee.set(p.userId);
    this.schedConflicts.set(null);
  }

  /** Repeat: create a master schedule from the form, then publish its first two weeks. */
  private saveAsSeries(): void {
    const clientId = this.fClientId();
    if (clientId == null) {
      this.formError.set('Repeating visits need a client. Pick a client, or set Repeat to None.');
      return;
    }
    const pattern = this.fRepeat() as SeriesPattern;
    const days = [...this.fRepeatDays()];
    if (pattern !== 'Monthly' && days.length === 0) {
      this.formError.set('Choose at least one day to repeat on.');
      return;
    }
    if (this.fRepeatUntil() && this.fRepeatUntil() < this.fDate()) {
      this.formError.set('The repeat end date is before the first visit.');
      return;
    }
    const open = this.fOpenShift();
    const slotBase = { seriesSlotId: null, startTime: this.fStart(), endTime: this.fEnd(), assignedUserId: null };
    const slots =
      pattern === 'Monthly'
        ? [{ ...slotBase, dayOfWeek: 0, weekNo: null, monthDay: this.repeatMonthDay(), monthWeekNo: null }]
        : days.map((d) => ({ ...slotBase, dayOfWeek: d, weekNo: pattern === 'BiWeekly' ? 1 : null, monthDay: null, monthWeekNo: null }));
    const rate = (v: unknown) => (Number(v) > 0 ? Number(v) : null);
    this.formBusy.set(true);
    this.formError.set('');
    this.seriesService
      .create({
        clientId,
        serviceTypeId: this.fServiceTypeId(),
        assignedUserId: open ? null : this.fAssignee(),
        title: this.fTitle().trim(),
        pattern,
        startDate: this.fDate(),
        endDate: this.fRepeatUntil() || null,
        payRatePerHour: rate(this.fRate()),
        billRatePerHour: rate(this.fBillRate()),
        autoPublishWeeksAhead: 2,
        notes: null,
        slots,
      })
      .subscribe({
        next: (series) => {
          const today = localDateOnly();
          const from = this.fDate() > today ? this.fDate() : today;
          this.seriesService
            .publish({
              from,
              to: addDaysDateOnly(from, 13),
              seriesIds: [series.seriesId],
              clientId: null,
              openShiftOnCaregiverConflict: false,
            })
            .subscribe({
              next: (r) => {
                this.formBusy.set(false);
                this.formOpen.set(false);
                const skipped = r.skipped.length ? ` ${r.skipped.length} skipped (conflicts) — see Master schedules.` : '';
                this.toast.success(`Repeating visits saved: ${r.created} visit(s) published for the next 2 weeks.${skipped}`);
                this.load();
              },
              error: (err: Error) => {
                this.formBusy.set(false);
                this.formOpen.set(false);
                this.toast.error(`The master schedule was saved but publishing failed: ${err.message}. Publish it from Master schedules.`);
                this.load();
              },
            });
        },
        error: (err: Error) => {
          const lines = apiErrorLines(err, 'Could not save the repeating visits.');
          this.formError.set(lines.message || err.message);
          this.formErrorDetails.set(lines.errors);
          this.formBusy.set(false);
        },
      });
  }

  canManage(): boolean {
    return !!this.access()?.canManage;
  }

  respond(action: 'Accept' | 'Reject'): void {
    const d = this.detail();
    if (!d) return;
    if (action === 'Reject' && !this.rejectReason().trim()) {
      this.detailError.set('Please provide a reason to reject.');
      return;
    }
    this.actionBusy.set(true);
    this.detailError.set('');
    this.service
      .respond(d.schedule.scheduleId, { action, reason: this.rejectReason().trim() || null })
      .subscribe({
        next: () => {
          this.actionBusy.set(false);
          this.actionNotice.set(`Schedule ${action.toLowerCase()}ed.`);
          this.reloadDetail();
        },
        error: (err: Error) => {
          this.detailError.set(err.message || 'Could not update the schedule.');
          this.actionBusy.set(false);
        },
      });
  }

  addNote(): void {
    const d = this.detail();
    if (!d || !this.noteText().trim()) return;
    this.actionBusy.set(true);
    this.detailError.set('');
    this.service
      .addNote(d.schedule.scheduleId, {
        noteType: this.noteIsInjury() ? 'Injury' : 'Note',
        message: this.noteText().trim(),
      })
      .subscribe({
        next: () => {
          this.actionBusy.set(false);
          this.noteText.set('');
          this.noteIsInjury.set(false);
          this.reloadDetail();
        },
        error: (err: Error) => {
          this.detailError.set(err.message || 'Could not add the note.');
          this.actionBusy.set(false);
        },
      });
  }

  // ------------------------------------------------------- Client picker

  searchClients(q: string): void {
    this.clientQuery.set(q);
    if (!q.trim()) {
      this.clientOptions.set([]);
      this.clientPickerOpen.set(false);
      return;
    }
    this.clients.list(1, 8, { status: 'Active', search: q.trim() }).subscribe({
      next: (res) => {
        this.clientOptions.set(res.items);
        this.clientPickerOpen.set(true);
      },
      error: () => this.clientOptions.set([]),
    });
  }

  selectClient(c: Client): void {
    this.fClientId.set(c.clientId);
    this.clientQuery.set(c.fullName);
    this.clientPickerOpen.set(false);
    this.fCustomer.set(c.fullName);
    const addr = [c.addressLine1, c.addressLine2, c.city, c.state, c.postalCode].filter((x) => !!x).join(', ');
    if (addr) this.fLocation.set(addr);
    if (c.serviceTypes.length === 1 && this.fServiceTypeId() == null) {
      this.fServiceTypeId.set(c.serviceTypes[0].serviceTypeId);
    }
    if (!this.fTitle().trim() && this.fServiceTypeId() != null) {
      const st = this.serviceTypes().find((s) => s.serviceTypeId === this.fServiceTypeId());
      if (st) this.fTitle.set(`${st.name} — ${c.fullName}`);
    }
    this.loadEligible();
    this.loadRates(c.clientId);
  }

  clearClient(): void {
    this.fClientId.set(null);
    this.clientQuery.set('');
    this.clientOptions.set([]);
    this.eligible.set(null);
    this.fResolvedRates.set(null);
  }

  /** Pre-fill bill / pay rate from the client, its payers, then the agency defaults. */
  private loadRates(clientId: number): void {
    this.ratesAcknowledged = false;
    this.rateConflict.set(null);
    this.payerService.resolvedRates(clientId).subscribe({
      next: (r) => {
        if (this.fClientId() !== clientId) return;
        this.fResolvedRates.set(r);
        this.fBillRate.set(r.billRatePerHour ?? 0);
        this.fRate.set(r.payRatePerHour ?? 0);
      },
      error: () => this.fResolvedRates.set(null),
    });
  }

  setServiceType(id: number | null): void {
    this.fServiceTypeId.set(id);
    if (this.fClientId() != null) this.loadEligible();
  }

  loadEligible(): void {
    const clientId = this.fClientId();
    if (clientId == null) {
      this.eligible.set(null);
      return;
    }
    this.clients.eligibleCaregivers(clientId, this.fServiceTypeId() ?? undefined).subscribe({
      next: (list) => {
        this.eligible.set(list);
        // If the current assignee is no longer eligible, clear it.
        const cur = this.fAssignee();
        if (cur != null && !list.some((e) => e.userId === cur)) this.fAssignee.set(null);
      },
      error: () => this.eligible.set(null),
    });
  }

  // ------------------------------------------------------- Clock + signature

  async startClock(phase: 'ClockIn' | 'ClockOut'): Promise<void> {
    const d = this.detail();
    if (!d) return;
    this.actionBusy.set(true);
    this.detailError.set('');
    this.clockPhase.set(phase);

    const settings = this.clientSettings();
    let coords: { latitude: number; longitude: number } | null = null;
    if (settings?.captureClockLocation !== false) {
      coords = await this.locationTracking.getCurrentPosition();
    }

    // Offer the client signature for every client visit (both phases). It is
    // mandatory when the tenant setting requires it, and skippable otherwise.
    const isClient = d.schedule.clientId != null;
    if (isClient) {
      const required =
        phase === 'ClockIn'
          ? !!settings?.requireClientSignatureOnClockIn
          : settings?.requireClientSignatureOnClockOut ?? true;
      this.pendingCoords.set(coords);
      this.sigData.set(null);
      this.sigName.set(d.schedule.clientName ?? '');
      this.sigError.set('');
      this.sigRequired.set(required);
      this.sigOpen.set(true);
      this.actionBusy.set(false);
      return;
    }

    this.sendClock(phase, { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null });
  }

  /** Continue clock in/out without a signature (only allowed when not required). */
  skipSignature(): void {
    const phase = this.clockPhase();
    if (!phase || this.sigRequired()) return;
    const coords = this.pendingCoords();
    this.sendClock(phase, { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null });
  }

  confirmSignature(): void {
    const phase = this.clockPhase();
    if (!phase) return;
    if (!this.sigData()) {
      this.sigError.set('A signature is required.');
      return;
    }
    const coords = this.pendingCoords();
    this.actionBusy.set(true);
    this.sendClock(phase, {
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      signatureBase64: this.stripDataUrl(this.sigData()!),
      signedByName: this.sigName().trim() || null,
    });
  }

  cancelSignature(): void {
    this.sigOpen.set(false);
    this.clockPhase.set(null);
    this.actionBusy.set(false);
  }

  private sendClock(phase: 'ClockIn' | 'ClockOut', body: ClockRequest): void {
    const d = this.detail();
    if (!d) return;
    this.actionBusy.set(true);
    const call$ =
      phase === 'ClockIn'
        ? this.service.clockIn(d.schedule.scheduleId, body)
        : this.service.clockOut(d.schedule.scheduleId, body);
    call$.subscribe({
      next: (msg) => {
        this.actionBusy.set(false);
        this.actionNotice.set(msg);
        this.sigOpen.set(false);
        this.clockPhase.set(null);
        if (phase === 'ClockIn') this.locationTracking.start(d.schedule.scheduleId);
        else this.locationTracking.stop();
        this.reloadDetail();
      },
      error: (err: Error) => {
        this.actionBusy.set(false);
        const message = err.message || 'Could not record the clock action.';
        if (this.sigOpen()) this.sigError.set(message);
        else this.detailError.set(message);
      },
    });
  }

  private stripDataUrl(dataUrl: string): string {
    const comma = dataUrl.indexOf(',');
    return comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
  }

  openSignatures(scheduleId: number, entryId: number): void {
    this.sigView.set([]);
    this.service.signatures(scheduleId, entryId).subscribe({
      next: (sigs) => this.sigView.set(sigs),
      error: () => this.sigView.set([]),
    });
  }

  closeSignatureViewer(): void {
    this.sigView.set(null);
  }

  loadCareLog(id: number): void {
    this.careLogEntries.set([]);
    this.service.careLog(id).subscribe({
      next: (log) => this.careLogEntries.set(log),
      error: () => this.careLogEntries.set([]),
    });
  }

  toggleCareLog(): void {
    this.careLogOpen.update((v) => !v);
  }

  mapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  hasOpenTimer(): boolean {
    return !!this.detail()?.timeEntries.some((t) => !t.clockOutUtc);
  }

  /** Once a clock-in/out cycle is recorded (or the shift is Completed) the clock is frozen. */
  isShiftDone(): boolean {
    const d = this.detail();
    if (!d) return false;
    return d.schedule.status === 'Completed' || d.timeEntries.some((t) => !!t.clockOutUtc);
  }

  openManual(): void {
    const d = this.detail();
    if (!d) return;
    const start = parseLocal(d.schedule.startUtc);
    this.manualDate.set(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
    this.manualStart.set(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    const end = parseLocal(d.schedule.endUtc);
    this.manualEnd.set(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
    this.showManual.set(true);
  }

  saveManual(): void {
    const d = this.detail();
    if (!d) return;
    const clockInUtc = `${this.manualDate()}T${this.manualStart()}:00`;
    const clockOutUtc = `${this.manualDate()}T${this.manualEnd()}:00`;
    if (clockOutUtc <= clockInUtc) {
      this.detailError.set('End must be after start.');
      return;
    }
    this.actionBusy.set(true);
    this.detailError.set('');
    this.service.addTime(d.schedule.scheduleId, { clockInUtc, clockOutUtc, note: null }).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.showManual.set(false);
        this.reloadDetail();
      },
      error: (err: Error) => {
        this.detailError.set(err.message || 'Could not add time.');
        this.actionBusy.set(false);
      },
    });
  }

  deleteSchedule(): void {
    const d = this.detail();
    if (!d || !this.canManage()) return;
    if (!confirm('Delete this schedule and all its notes and time entries?')) return;
    this.actionBusy.set(true);
    this.service.remove(d.schedule.scheduleId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.detail.set(null);
        this.load();
      },
      error: (err: Error) => {
        this.detailError.set(err.message || 'Could not delete.');
        this.actionBusy.set(false);
      },
    });
  }

  totalLogged(): number {
    const d = this.detail();
    if (!d) return 0;
    return Math.round(d.timeEntries.reduce((sum, t) => sum + (t.hours || 0), 0) * 100) / 100;
  }
}
