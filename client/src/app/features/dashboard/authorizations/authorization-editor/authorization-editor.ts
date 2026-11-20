/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import {
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import {
  Authorization,
  AuthorizationDetail,
  AuthorizationFormOptions,
  AuthorizationImpact,
  AuthorizationImpactRow,
  AuthorizationStatus,
  LimitUnit,
  SaveAuthorizationRequest,
  WEEKDAY_CODES,
  WeekdayCode,
  calculateDisplayStatus,
  displayStatusClass,
  displayStatusLabel,
  formatDateOnly,
  formatLimit,
} from '../../../../core/models/authorization.model';
import { wallRange } from '../../../../core/models/scheduler.model';
import { Client } from '../../../../core/models/client.model';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ClientService } from '../../../../core/services/client.service';
import { ToastService } from '../../../../core/services/toast.service';

/** Limit inputs: strings so that empty means "no limit". */
interface LimitField {
  key: 'maxDay' | 'maxWeek' | 'maxMonth' | 'total';
  label: string;
  max: number | null;
  /** Label / max when the limit unit is Visits. */
  visitLabel: string;
  visitMax: number | null;
}

const num = (v: string) =>
  v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v);
const hoursText = (n: number | null | undefined) => (n == null ? '' : String(n));

/**
 * Full-screen Create / Edit Authorization overlay: sections 01–05 on the left,
 * a live summary on the right. Edit mode locks the client and the payer.
 */
@Component({
  selector: 'app-authorization-editor',
  imports: [FormsModule],
  templateUrl: './authorization-editor.html',
})
export class AuthorizationEditor implements OnInit {
  private readonly service = inject(AuthorizationService);
  private readonly clients = inject(ClientService);
  private readonly toast = inject(ToastService);

  readonly mode = input<'create' | 'edit'>('create');
  readonly authorization = input<Authorization | null>(null);
  /** Pre-fills (and locks) the client, e.g. from the client profile. */
  readonly presetClientId = input<number | null>(null);
  /** Pre-fills the payer when it is one of the client's Authorization payers. */
  readonly presetPayerId = input<number | null>(null);

  readonly saved = output<AuthorizationDetail>();
  readonly closed = output<void>();

  readonly isEdit = computed(() => this.mode() === 'edit' && !!this.authorization());

  // ---- Client picker
  readonly clientId = signal<number | null>(null);
  readonly clientName = signal('');
  readonly clientQuery = signal('');
  readonly clientOptions = signal<Client[]>([]);
  readonly clientPickerOpen = signal(false);
  readonly clientSearching = signal(false);
  readonly clientLocked = computed(() => this.isEdit() || this.presetClientId() != null);
  private readonly clientSearch$ = new Subject<string>();
  private optionsSub?: Subscription;

  // ---- Options for the chosen client
  readonly options = signal<AuthorizationFormOptions | null>(null);
  readonly optionsLoading = signal(false);
  readonly authPayers = computed(() =>
    (this.options()?.payers ?? []).filter((p) => p.isAuthorizationPayer),
  );
  readonly clientServiceTypes = computed(() =>
    (this.options()?.serviceTypes ?? []).filter((s) => s.isClientService),
  );
  readonly otherServiceTypes = computed(() =>
    (this.options()?.serviceTypes ?? []).filter((s) => !s.isClientService),
  );
  /** The client has payers but none is linked with the "Authorization" distribution. */
  readonly noAuthPayerHint = computed(() => {
    const o = this.options();
    return !!o && o.payers.length > 0 && this.authPayers().length === 0;
  });
  readonly noPayers = computed(() => {
    const o = this.options();
    return !!o && o.payers.length === 0;
  });

  // ---- Form fields
  readonly payerId = signal<number | null>(null);
  readonly payerName = signal('');
  readonly serviceTypeId = signal<number | null>(null);
  readonly name = signal('');
  readonly number = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly maxDay = signal('');
  readonly maxWeek = signal('');
  readonly maxMonth = signal('');
  readonly total = signal('');
  readonly allowedDays = signal<WeekdayCode[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  readonly notes = signal('');
  readonly status = signal<AuthorizationStatus>('Active');
  readonly limitUnit = signal<LimitUnit>('Hours');
  readonly isVisits = computed(() => this.limitUnit() === 'Visits');
  readonly unitWord = computed(() => (this.isVisits() ? 'visits' : 'hours'));

  // ---- Impact review (edit mode): runs before the final save.
  readonly review = signal<AuthorizationImpact | null>(null);
  readonly reviewing = signal(false);
  private pendingRequest: SaveAuthorizationRequest | null = null;
  readonly range = wallRange;

  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal(false);

  readonly weekdays = WEEKDAY_CODES;
  readonly statusClass = displayStatusClass;
  readonly statusLabel = displayStatusLabel;
  readonly limitFields: LimitField[] = [
    { key: 'maxDay', label: 'Maximum Hours Per Day', max: 24, visitLabel: 'Maximum Visits Per Day', visitMax: 24 },
    { key: 'maxWeek', label: 'Maximum Hours Per Week', max: 168, visitLabel: 'Maximum Visits Per Week', visitMax: 168 },
    { key: 'maxMonth', label: 'Maximum Hours Per Month', max: 744, visitLabel: 'Maximum Visits Per Month', visitMax: 744 },
    { key: 'total', label: 'Total hours (whole period)', max: null, visitLabel: 'Total visits (whole period)', visitMax: null },
  ];

  readonly calculatedStatus = computed(() =>
    calculateDisplayStatus(this.status(), this.startDate(), this.endDate()),
  );

  readonly selectedServiceTypeName = computed(() => {
    const id = this.serviceTypeId();
    if (id == null) return '';
    return (
      this.options()?.serviceTypes.find((s) => s.serviceTypeId === id)?.name ??
      (this.authorization()?.serviceTypeId === id ? this.authorization()!.serviceTypeName : '')
    );
  });

  readonly selectedPayerName = computed(() => {
    const id = this.payerId();
    if (id == null) return '';
    return this.authPayers().find((p) => p.payerId === id)?.payerName ?? this.payerName();
  });

  /** Right-hand summary card. */
  readonly summary = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    const visits = this.isVisits();
    const limit = (v: string) => {
      const n = num(v);
      if (n == null) return 'No limit';
      return visits ? `${n} visit${n === 1 ? '' : 's'}` : `${n.toFixed(2)} hours`;
    };
    return {
      client: this.clientName() || '—',
      payer: this.selectedPayerName() || '—',
      serviceType: this.selectedServiceTypeName() || '—',
      period:
        start || end
          ? `${start ? formatDateOnly(start) : '…'} – ${end ? formatDateOnly(end) : '…'}`
          : '—',
      daily: limit(this.maxDay()),
      weekly: limit(this.maxWeek()),
      monthly: limit(this.maxMonth()),
      total: limit(this.total()),
      days:
        this.weekdays
          .filter((d) => this.allowedDays().includes(d.value))
          .map((d) => d.label)
          .join(', ') || '—',
    };
  });

  /** Field-level validation messages (shown after the first save attempt). */
  readonly errors = computed(() => {
    const e: Record<string, string> = {};
    if (this.clientId() == null) e['client'] = 'Select a client.';
    if (this.payerId() == null) e['payer'] = 'Select a payer.';
    if (this.serviceTypeId() == null) e['serviceType'] = 'Select a service type.';
    if (!this.name().trim()) e['name'] = 'Enter an authorization name.';
    if (!this.startDate()) e['start'] = 'Enter the start date.';
    if (!this.endDate()) e['end'] = 'Enter the end date.';
    else if (this.startDate() && this.endDate() < this.startDate())
      e['end'] = 'End date cannot be before the start date.';
    for (const f of this.limitFields) {
      const raw = this.limitValue(f.key);
      if (raw === '' || raw == null) continue;
      const n = num(String(raw));
      if (this.isVisits()) {
        if (n == null || n < 1 || !Number.isInteger(n)) e[f.key] = 'Enter a whole number of visits (1 or more), or leave it empty.';
        else if (f.visitMax != null && n > f.visitMax) e[f.key] = `Cannot be more than ${f.visitMax} visits.`;
      } else if (n == null || n < 0.25) e[f.key] = 'Enter at least 0.25 hours, or leave it empty.';
      else if (f.max != null && n > f.max) e[f.key] = `Cannot be more than ${f.max} hours.`;
    }
    if (this.allowedDays().length === 0) e['days'] = 'Choose at least one day.';
    return e;
  });
  readonly hasErrors = computed(() => Object.keys(this.errors()).length > 0);

  constructor() {
    this.clientSearch$.pipe(debounceTime(300)).subscribe((q) => this.runClientSearch(q));
  }

  ngOnInit(): void {
    const a = this.isEdit() ? this.authorization() : null;
    if (a) {
      this.clientId.set(a.clientId);
      this.clientName.set(a.clientName);
      this.clientQuery.set(a.clientName);
      this.payerId.set(a.payerId);
      this.payerName.set(a.payerName);
      this.serviceTypeId.set(a.serviceTypeId);
      this.name.set(a.authorizationName);
      this.number.set(a.authorizationNumber ?? '');
      this.startDate.set(a.startDate?.slice(0, 10) ?? '');
      this.endDate.set(a.endDate?.slice(0, 10) ?? '');
      this.maxDay.set(hoursText(a.maxHoursPerDay));
      this.maxWeek.set(hoursText(a.maxHoursPerWeek));
      this.maxMonth.set(hoursText(a.maxHoursPerMonth));
      this.total.set(hoursText(a.totalAuthorizedHours));
      this.allowedDays.set([...(a.allowedDays ?? [])]);
      this.notes.set(a.notes ?? '');
      this.status.set(a.status);
      this.limitUnit.set(a.limitUnit ?? 'Hours');
      this.loadOptions(a.clientId);
      return;
    }
    const presetClient = this.presetClientId();
    if (presetClient != null) {
      this.clientId.set(presetClient);
      this.clients.get(presetClient).subscribe({
        next: (c) => {
          this.clientName.set(c.fullName);
          this.clientQuery.set(c.fullName);
        },
        error: () => {},
      });
      this.loadOptions(presetClient);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.review()) this.cancelReview();
    else if (!this.saving()) this.closed.emit();
  }

  // ------------------------------------------------------------- Client

  onClientQuery(q: string): void {
    this.clientQuery.set(q);
    if (this.clientId() != null) this.clearClient(false);
    this.clientSearch$.next(q);
  }

  private runClientSearch(q: string): void {
    if (!q.trim()) {
      this.clientOptions.set([]);
      this.clientPickerOpen.set(false);
      return;
    }
    this.clientSearching.set(true);
    this.clients.list(1, 8, { status: 'Active', search: q.trim() }).subscribe({
      next: (res) => {
        this.clientOptions.set(res.items);
        this.clientPickerOpen.set(true);
        this.clientSearching.set(false);
      },
      error: () => {
        this.clientOptions.set([]);
        this.clientSearching.set(false);
      },
    });
  }

  selectClient(c: Client): void {
    this.clientId.set(c.clientId);
    this.clientName.set(c.fullName);
    this.clientQuery.set(c.fullName);
    this.clientPickerOpen.set(false);
    this.payerId.set(null);
    this.serviceTypeId.set(null);
    this.loadOptions(c.clientId);
  }

  clearClient(resetQuery = true): void {
    this.clientId.set(null);
    this.clientName.set('');
    if (resetQuery) this.clientQuery.set('');
    this.options.set(null);
    this.payerId.set(null);
    this.serviceTypeId.set(null);
  }

  private loadOptions(clientId: number): void {
    this.optionsSub?.unsubscribe();
    this.optionsLoading.set(true);
    this.optionsSub = this.service.formOptions(clientId).subscribe({
      next: (o) => {
        if (this.clientId() !== clientId) return;
        this.options.set(o);
        this.optionsLoading.set(false);
        if (this.isEdit()) return;
        const auth = o.payers.filter((p) => p.isAuthorizationPayer);
        const preset = this.presetPayerId();
        if (preset != null && auth.some((p) => p.payerId === preset)) this.payerId.set(preset);
        else if (auth.length === 1) this.payerId.set(auth[0].payerId);
        const clientTypes = o.serviceTypes.filter((s) => s.isClientService);
        if (this.serviceTypeId() == null && clientTypes.length === 1)
          this.serviceTypeId.set(clientTypes[0].serviceTypeId);
      },
      error: (err: Error) => {
        this.optionsLoading.set(false);
        this.error.set(err.message || 'Could not load the client’s payers and service types.');
      },
    });
  }

  // ------------------------------------------------------------- Fields

  limitValue(key: LimitField['key']): string {
    switch (key) {
      case 'maxDay':
        return this.maxDay();
      case 'maxWeek':
        return this.maxWeek();
      case 'maxMonth':
        return this.maxMonth();
      default:
        return this.total();
    }
  }

  setLimit(key: LimitField['key'], value: unknown): void {
    const v = value == null ? '' : String(value);
    switch (key) {
      case 'maxDay':
        this.maxDay.set(v);
        break;
      case 'maxWeek':
        this.maxWeek.set(v);
        break;
      case 'maxMonth':
        this.maxMonth.set(v);
        break;
      default:
        this.total.set(v);
    }
  }

  fieldLabel(f: LimitField): string {
    return this.isVisits() ? f.visitLabel : f.label;
  }

  fieldMax(f: LimitField): number | null {
    return this.isVisits() ? f.visitMax : f.max;
  }

  setUnit(unit: LimitUnit): void {
    this.limitUnit.set(unit);
  }

  impactLabel(r: AuthorizationImpactRow): string {
    return `${formatLimit(r.hoursBefore, this.limitUnit(), '0')} → ${formatLimit(r.hoursAfter, this.limitUnit(), '0')}`;
  }

  toggleDay(d: WeekdayCode): void {
    this.allowedDays.update((list) =>
      list.includes(d) ? list.filter((x) => x !== d) : [...list, d],
    );
  }

  isDayOn(d: WeekdayCode): boolean {
    return this.allowedDays().includes(d);
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
    const order = this.weekdays.map((d) => d.value);
    const request: SaveAuthorizationRequest = {
      clientId: this.clientId()!,
      payerId: this.payerId()!,
      serviceTypeId: this.serviceTypeId()!,
      authorizationName: this.name().trim(),
      authorizationNumber: this.number().trim() || null,
      startDate: this.startDate(),
      endDate: this.endDate(),
      maxHoursPerDay: num(this.maxDay()),
      maxHoursPerWeek: num(this.maxWeek()),
      maxHoursPerMonth: num(this.maxMonth()),
      totalAuthorizedHours: num(this.total()),
      allowedDays: [...this.allowedDays()].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
      notes: this.notes().trim() || null,
      limitUnit: this.limitUnit(),
    };
    const existing = this.isEdit() ? this.authorization() : null;
    if (existing) {
      // Edit: review the impact on the client's visits before the final save.
      this.pendingRequest = request;
      this.reviewing.set(true);
      this.saving.set(true);
      this.service.impact(existing.authorizationId, request).subscribe({
        next: (impact) => {
          this.saving.set(false);
          this.review.set(impact);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.reviewing.set(false);
          this.error.set(err.message || 'Could not check the impact of this change.');
        },
      });
      return;
    }
    this.persist(request);
  }

  cancelReview(): void {
    this.review.set(null);
    this.reviewing.set(false);
    this.pendingRequest = null;
  }

  confirmReview(): void {
    const r = this.review();
    if (!r || r.frozen.length || !this.pendingRequest) return;
    const request = this.pendingRequest;
    this.review.set(null);
    this.reviewing.set(false);
    this.persist(request);
  }

  private persist(request: SaveAuthorizationRequest): void {
    const existing = this.isEdit() ? this.authorization() : null;
    this.saving.set(true);
    const req$ = existing
      ? this.service.update(existing.authorizationId, request)
      : this.service.create(request);
    req$.subscribe({
      next: (d) => {
        this.saving.set(false);
        this.toast.success(existing ? 'Authorization saved.' : 'Authorization created.');
        this.saved.emit(d);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save the authorization.');
      },
    });
  }
}
