/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { formatDateOnly, todayDateOnly } from '../../../../core/models/authorization.model';
import { Client } from '../../../../core/models/client.model';
import {
  DAYS_OF_WEEK,
  MONTH_WEEK_NUMBERS,
  SERIES_PATTERNS,
  SaveSeriesRequest,
  ScheduleSeries,
  SeriesPattern,
  SeriesSlot,
  slotLabel,
} from '../../../../core/models/schedule-series.model';
import { ServiceType } from '../../../../core/models/service-type.model';
import { UserDto } from '../../../../core/models/user.model';
import { ClientService } from '../../../../core/services/client.service';
import { ScheduleSeriesService } from '../../../../core/services/schedule-series.service';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { ServiceTypeService } from '../../../../core/services/service-type.service';
import { ToastService } from '../../../../core/services/toast.service';

/** A slot row in the grid; `monthlyMode` only matters for the Monthly pattern. */
interface SlotRow {
  key: number;
  seriesSlotId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  weekNo: number;
  monthlyMode: 'date' | 'weekday';
  monthDay: number;
  monthWeekNo: number;
  assignedUserId: number | null;
}

const MAX_SLOTS = 21;
let slotKey = 1;

/** Full-screen create / edit of a master (recurring) schedule. */
@Component({
  selector: 'app-series-editor',
  imports: [FormsModule],
  templateUrl: './series-editor.html',
})
export class SeriesEditor implements OnInit {
  private readonly service = inject(ScheduleSeriesService);
  private readonly scheduler = inject(SchedulerService);
  private readonly clients = inject(ClientService);
  private readonly serviceTypeService = inject(ServiceTypeService);
  private readonly toast = inject(ToastService);

  /** null = create. */
  readonly seriesId = input<number | null>(null);
  readonly saved = output<ScheduleSeries>();
  readonly closed = output<void>();

  readonly isEdit = computed(() => this.seriesId() != null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal(false);
  readonly existing = signal<ScheduleSeries | null>(null);

  // Client picker
  readonly clientId = signal<number | null>(null);
  readonly clientName = signal('');
  readonly clientQuery = signal('');
  readonly clientOptions = signal<Client[]>([]);
  readonly clientPickerOpen = signal(false);
  private readonly clientSearch$ = new Subject<string>();

  readonly serviceTypes = signal<ServiceType[]>([]);
  readonly caregivers = signal<UserDto[]>([]);

  // Fields
  readonly serviceTypeId = signal<number | null>(null);
  readonly title = signal('');
  readonly assignedUserId = signal<number | null>(null);
  readonly pattern = signal<SeriesPattern>('Weekly');
  readonly startDate = signal(todayDateOnly());
  readonly endDate = signal('');
  readonly payRate = signal<string>('');
  readonly billRate = signal<string>('');
  readonly autoWeeks = signal(2);
  readonly notes = signal('');
  readonly slots = signal<SlotRow[]>([]);
  readonly applyToPublished = signal(true);
  readonly applyFrom = signal(todayDateOnly());

  readonly patterns = SERIES_PATTERNS;
  readonly days = DAYS_OF_WEEK;
  readonly monthWeeks = MONTH_WEEK_NUMBERS;
  readonly monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly weekOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  readonly fmtDate = formatDateOnly;
  readonly maxSlots = MAX_SLOTS;

  readonly errors = computed(() => {
    const e: Record<string, string> = {};
    if (this.clientId() == null) e['client'] = 'Select a client.';
    if (!this.title().trim()) e['title'] = 'Enter a title.';
    if (!this.startDate()) e['start'] = 'Enter the start date.';
    if (this.endDate() && this.startDate() && this.endDate() < this.startDate()) e['end'] = 'End date cannot be before the start date.';
    const rows = this.slots();
    if (rows.length === 0) e['slots'] = 'Add at least one slot.';
    else if (rows.length > MAX_SLOTS) e['slots'] = `At most ${MAX_SLOTS} slots.`;
    else if (rows.some((r) => !r.startTime || !r.endTime || r.endTime <= r.startTime))
      e['slots'] = 'Every slot needs an end time after its start time (overnight slots are not supported).';
    for (const key of ['payRate', 'billRate'] as const) {
      const v = key === 'payRate' ? this.payRate() : this.billRate();
      if (v !== '' && v != null && !(Number(v) >= 0)) e[key] = 'Enter a rate of 0 or more, or leave it empty.';
    }
    if (this.isEdit() && this.applyToPublished() && !this.applyFrom()) e['applyFrom'] = 'Choose the date.';
    return e;
  });
  readonly hasErrors = computed(() => Object.keys(this.errors()).length > 0);

  /** Right-hand summary. */
  readonly summary = computed(() => {
    const cg = this.assignedUserId();
    return {
      client: this.clientName() || '—',
      caregiver: cg == null ? 'Open shift' : (this.caregivers().find((u) => u.userId === cg)?.fullName ?? '—'),
      pattern: this.patterns.find((p) => p.value === this.pattern())?.label ?? '',
      period: `${formatDateOnly(this.startDate())} – ${this.endDate() ? formatDateOnly(this.endDate()) : 'no end'}`,
      autoPublish: this.autoWeeks() > 0 ? `${this.autoWeeks()} week(s) ahead` : 'Manual only',
      slots: this.slots().map((r) => this.rowLabel(r)),
      hoursPerCycle: this.slots().reduce((sum, r) => sum + this.rowHours(r), 0),
    };
  });

  constructor() {
    this.clientSearch$.pipe(debounceTime(300)).subscribe((q) => this.runClientSearch(q));
    this.serviceTypeService.active().subscribe({ next: (s) => this.serviceTypes.set(s), error: () => {} });
    this.scheduler.assignableUsers().subscribe({ next: (u) => this.caregivers.set(u), error: () => {} });
  }

  ngOnInit(): void {
    const id = this.seriesId();
    if (id == null) {
      this.slots.set([this.newRow(1)]);
      return;
    }
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (s) => {
        this.existing.set(s);
        this.clientId.set(s.clientId);
        this.clientName.set(s.clientName);
        this.clientQuery.set(s.clientName);
        this.serviceTypeId.set(s.serviceTypeId);
        this.title.set(s.title);
        this.assignedUserId.set(s.assignedUserId);
        this.pattern.set(s.pattern);
        this.startDate.set(s.startDate?.slice(0, 10) ?? '');
        this.endDate.set(s.endDate?.slice(0, 10) ?? '');
        this.payRate.set(s.payRatePerHour == null ? '' : String(s.payRatePerHour));
        this.billRate.set(s.billRatePerHour == null ? '' : String(s.billRatePerHour));
        this.autoWeeks.set(s.autoPublishWeeksAhead ?? 0);
        this.notes.set(s.notes ?? '');
        this.slots.set(s.slots.map((x) => this.fromSlot(x)));
        this.applyToPublished.set((s.publishedVisitCount ?? 0) > 0);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the master schedule.');
        this.loading.set(false);
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.saving()) this.closed.emit();
  }

  // ------------------------------------------------------------- Client

  onClientQuery(q: string): void {
    this.clientQuery.set(q);
    if (this.clientId() != null) {
      this.clientId.set(null);
      this.clientName.set('');
    }
    this.clientSearch$.next(q);
  }

  private runClientSearch(q: string): void {
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
    this.clientId.set(c.clientId);
    this.clientName.set(c.fullName);
    this.clientQuery.set(c.fullName);
    this.clientPickerOpen.set(false);
    if (c.serviceTypes?.length === 1 && this.serviceTypeId() == null) {
      this.serviceTypeId.set(c.serviceTypes[0].serviceTypeId);
    }
    if (!this.title().trim()) {
      const st = this.serviceTypes().find((s) => s.serviceTypeId === this.serviceTypeId());
      this.title.set(st ? `${st.name} — ${c.fullName}` : `Care — ${c.fullName}`);
    }
  }

  // ------------------------------------------------------------- Slots

  private newRow(dayOfWeek: number): SlotRow {
    const last = this.slots().at(-1);
    return {
      key: slotKey++,
      seriesSlotId: null,
      dayOfWeek,
      startTime: last?.startTime ?? '09:00',
      endTime: last?.endTime ?? '13:00',
      weekNo: 1,
      monthlyMode: 'date',
      monthDay: 1,
      monthWeekNo: 1,
      assignedUserId: null,
    };
  }

  private fromSlot(s: SeriesSlot): SlotRow {
    return {
      key: slotKey++,
      seriesSlotId: s.seriesSlotId,
      dayOfWeek: s.dayOfWeek,
      startTime: (s.startTime ?? '').slice(0, 5),
      endTime: (s.endTime ?? '').slice(0, 5),
      weekNo: s.weekNo ?? 1,
      monthlyMode: s.monthDay != null ? 'date' : s.monthWeekNo != null ? 'weekday' : 'date',
      monthDay: s.monthDay ?? 1,
      monthWeekNo: s.monthWeekNo ?? 1,
      assignedUserId: s.assignedUserId,
    };
  }

  addSlot(): void {
    if (this.slots().length >= MAX_SLOTS) return;
    const last = this.slots().at(-1);
    const nextDay = last ? (last.dayOfWeek % 7) + 1 : 1;
    this.slots.update((rows) => [...rows, this.newRow(nextDay > 6 ? 0 : nextDay)]);
  }

  /** Quick add: one slot per picked weekday with the same times. */
  addWeekdays(days: number[]): void {
    const rows = [...this.slots()];
    for (const d of days) {
      if (rows.length >= MAX_SLOTS) break;
      if (rows.some((r) => r.dayOfWeek === d && r.weekNo === 1)) continue;
      rows.push({ ...this.newRow(d) });
    }
    this.slots.set(rows);
  }

  removeSlot(key: number): void {
    this.slots.update((rows) => rows.filter((r) => r.key !== key));
  }

  updateSlot<K extends keyof SlotRow>(key: number, field: K, value: SlotRow[K]): void {
    this.slots.update((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  rowLabel(r: SlotRow): string {
    return slotLabel(this.pattern(), this.toSlot(r) as SeriesSlot);
  }

  rowHours(r: SlotRow): number {
    if (!r.startTime || !r.endTime || r.endTime <= r.startTime) return 0;
    const [sh, sm] = r.startTime.split(':').map(Number);
    const [eh, em] = r.endTime.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  }

  private toSlot(r: SlotRow): SaveSeriesRequest['slots'][number] {
    const p = this.pattern();
    const byDate = p === 'Monthly' && r.monthlyMode === 'date';
    return {
      seriesSlotId: r.seriesSlotId,
      // Monthly by date has no weekday; the API still needs a number (ignored with monthDay).
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      weekNo: p === 'BiWeekly' ? r.weekNo : null,
      monthDay: byDate ? r.monthDay : null,
      monthWeekNo: p === 'Monthly' && !byDate ? r.monthWeekNo : null,
      assignedUserId: r.assignedUserId,
    };
  }

  showError(key: string): string {
    return this.submitted() ? (this.errors()[key] ?? '') : '';
  }

  // ------------------------------------------------------------- Save

  save(): void {
    this.submitted.set(true);
    this.error.set('');
    if (this.hasErrors()) {
      this.error.set('Please fix the highlighted fields.');
      return;
    }
    const rate = (v: string) => (v === '' || v == null ? null : Number(v));
    const request: SaveSeriesRequest = {
      clientId: this.clientId()!,
      serviceTypeId: this.serviceTypeId(),
      assignedUserId: this.assignedUserId(),
      title: this.title().trim(),
      pattern: this.pattern(),
      startDate: this.startDate(),
      endDate: this.endDate() || null,
      payRatePerHour: rate(this.payRate()),
      billRatePerHour: rate(this.billRate()),
      autoPublishWeeksAhead: Number(this.autoWeeks()) || 0,
      notes: this.notes().trim() || null,
      slots: this.slots().map((r) => this.toSlot(r)),
    };
    const id = this.seriesId();
    if (id != null) request.applyToPublishedFrom = this.applyToPublished() ? this.applyFrom() : null;
    this.saving.set(true);
    const req$ = id != null ? this.service.update(id, request) : this.service.create(request);
    req$.subscribe({
      next: (s) => {
        this.saving.set(false);
        const a = s.appliedToPublished;
        this.toast.success(
          a
            ? `Master schedule saved. Published visits: ${a.updated} updated, ${a.removed} removed, ${a.cancelled} cancelled.`
            : id != null
              ? 'Master schedule saved.'
              : 'Master schedule created. Publish it to create the visits.',
        );
        this.saved.emit(s);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save the master schedule.');
      },
    });
  }
}
