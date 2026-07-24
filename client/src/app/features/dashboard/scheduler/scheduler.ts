import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDto } from '../../../core/models/user.model';
import {
  Schedule,
  ScheduleDetail,
  ScheduleStatus,
  SchedulingAccess,
} from '../../../core/models/scheduler.model';
import { AuthService } from '../../../core/services/auth.service';
import { LocationTrackingService } from '../../../core/services/location-tracking.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { Alert } from '../../../shared/ui/alert/alert';

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

function colorFor(userId: number) {
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
  imports: [FormsModule, DatePipe, DecimalPipe, Alert],
  templateUrl: './scheduler.html',
})
export class Scheduler {
  private readonly service = inject(SchedulerService);
  private readonly auth = inject(AuthService);
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
  readonly fTitle = signal('');
  readonly fCustomer = signal('');
  readonly fLocation = signal('');
  readonly fAssignee = signal<number | null>(null);
  readonly fDate = signal('');
  readonly fStart = signal('09:00');
  readonly fEnd = signal('17:00');
  readonly fRate = signal(0);
  readonly fOt = signal(1.5);
  readonly fNotifyAdmin = signal(false);
  readonly fNotifyManager = signal(false);

  // Detail modal state.
  readonly detail = signal<ScheduleDetail | null>(null);
  readonly detailLoading = signal(false);
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

  constructor() {
    this.loadAccess();
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
      if (!map.has(s.assignedUserId)) {
        map.set(s.assignedUserId, { userId: s.assignedUserId, name: s.assignedUserName, color: colorFor(s.assignedUserId) });
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
    return f.size === 0 ? rows : rows.filter((s) => f.has(s.assignedUserId));
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
    this.fOt.set(1.5);
    this.fNotifyAdmin.set(false);
    this.fNotifyManager.set(false);
    // Prime defaults from settings.
    this.service.getSettings().subscribe({
      next: (s) => {
        if (this.editingId() === null && !this.formBusy()) {
          this.fRate.set(s.defaultPayRatePerHour);
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
    this.fDate.set(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
    this.fStart.set(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    this.fEnd.set(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
    this.fRate.set(s.payRatePerHour);
    this.fOt.set(s.overtimeMultiplier);
    this.detail.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  saveForm(): void {
    if (!this.fTitle().trim()) {
      this.formError.set('Title is required.');
      return;
    }
    if (this.fAssignee() == null) {
      this.formError.set('Please choose who to assign.');
      return;
    }
    const startUtc = `${this.fDate()}T${this.fStart()}:00`;
    const endUtc = `${this.fDate()}T${this.fEnd()}:00`;
    if (endUtc <= startUtc) {
      this.formError.set('End time must be after start time.');
      return;
    }
    this.formBusy.set(true);
    this.formError.set('');
    const base = {
      title: this.fTitle().trim(),
      customerName: this.fCustomer().trim() || null,
      location: this.fLocation().trim() || null,
      assignedUserId: this.fAssignee()!,
      startUtc,
      endUtc,
      payRatePerHour: Number(this.fRate()) || 0,
      overtimeMultiplier: Number(this.fOt()) || 1.5,
      colorTag: null,
    };
    const id = this.editingId();
    const req$ = id
      ? this.service.update(id, base)
      : this.service.create({ ...base, notifyAdmin: this.fNotifyAdmin(), notifyManager: this.fNotifyManager() });
    req$.subscribe({
      next: () => {
        this.formBusy.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err: Error) => {
        this.formError.set(err.message || 'Could not save the schedule.');
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
    this.service.detail(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
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

  private reloadDetail(): void {
    const d = this.detail();
    if (d) this.open(d.schedule.scheduleId);
    this.load();
  }

  isMine(s: Schedule): boolean {
    return s.assignedUserId === this.myUserId;
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

  clockIn(): void {
    const d = this.detail();
    if (!d) return;
    this.actionBusy.set(true);
    this.detailError.set('');
    this.service.clockIn(d.schedule.scheduleId).subscribe({
      next: (msg) => {
        this.actionBusy.set(false);
        this.actionNotice.set(msg);
        this.locationTracking.start(d.schedule.scheduleId);
        this.reloadDetail();
      },
      error: (err: Error) => {
        this.detailError.set(err.message || 'Could not clock in.');
        this.actionBusy.set(false);
      },
    });
  }

  clockOut(): void {
    const d = this.detail();
    if (!d) return;
    this.actionBusy.set(true);
    this.detailError.set('');
    this.service.clockOut(d.schedule.scheduleId).subscribe({
      next: (msg) => {
        this.actionBusy.set(false);
        this.actionNotice.set(msg);
        this.locationTracking.stop();
        this.reloadDetail();
      },
      error: (err: Error) => {
        this.detailError.set(err.message || 'Could not clock out.');
        this.actionBusy.set(false);
      },
    });
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
