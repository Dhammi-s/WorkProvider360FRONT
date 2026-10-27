/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientService } from '../../../../core/services/client.service';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Client, ClientAccess } from '../../../../core/models/client.model';
import { ClientVisit } from '../../../../core/models/portal.model';
import { CareLogEntry, SchedulingSettings } from '../../../../core/models/scheduler.model';
import { Alert } from '../../../../shared/ui/alert/alert';
import { VisitCalendar } from '../../../../shared/ui/visit-calendar/visit-calendar';
import { ScheduleEditor } from '../../../../shared/ui/schedule-editor/schedule-editor';
import { CareLog } from '../../../../shared/ui/care-log/care-log';
import { ClientInvoices } from '../../../../shared/ui/client-invoices/client-invoices';
import {
  ClientPayer,
  PayerRank,
  ResolvedRates,
  UpsertClientPayerRequest,
  payerRank,
} from '../../../../core/models/payer.model';
import { ClientPayerService } from '../../../../core/services/ClientPayerService';

type Section = 'main' | 'schedule' | 'carelog' | 'payers' | 'billing';

/** Payer form state; rates are strings so an empty box means "not set". */
interface PayerForm {
  payerId: number;
  payerName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: string;
  rank: PayerRank;
  billRate: string;
  payRate: string;
}

function emptyPayerForm(): PayerForm {
  return {
    payerId: 0,
    payerName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    status: 'Active',
    rank: 'Other',
    billRate: '',
    payRate: '',
  };
}

/** '' / 0 / invalid = not set (null) so rate resolution falls through to the next level. */
function toRate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function rateText(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

/** Full-page client profile: Main details, Schedule, Care Logs, Payers and Billing & Invoice. */
@Component({
  selector: 'app-client-profile',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, Alert, VisitCalendar, ScheduleEditor, CareLog, ClientInvoices],
  templateUrl: './client-profile.html',
})
export class ClientProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ClientService);
  private readonly scheduler = inject(SchedulerService);
  private readonly auth = inject(AuthService);
  private readonly clientPayerService = inject(ClientPayerService);

  readonly clientId = Number(this.route.snapshot.paramMap.get('id'));
  readonly canManage = computed(() => !!this.access()?.canManage);
  readonly payers = signal<ClientPayer[]>([]);
  readonly payersLoading = signal(false);
  readonly payersError = signal('');
  readonly client = signal<Client | null>(null);
  readonly access = signal<ClientAccess | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly section = signal<Section>('main');

  readonly sections: [Section, string][] = [
    ['main', 'Main'],
    ['schedule', 'Schedule'],
    ['carelog', 'Care Logs'],
    ['payers', 'Payers'],
    ['billing', 'Billing & Invoice'],
  ];

  readonly visits = signal<ClientVisit[]>([]);
  readonly editorOpen = signal(false);
  readonly editorStart = signal<Date | null>(null);

  readonly careLogVisit = signal<ClientVisit | null>(null);
  readonly careLogEntries = signal<CareLogEntry[]>([]);
  readonly careLogBusy = signal(false);

  // Payer add / edit (inline card).
  readonly payerFormOpen = signal(false);
  readonly payerForm = signal<PayerForm>(emptyPayerForm());
  readonly payerSaving = signal(false);
  readonly payerFormError = signal('');
  readonly payerNotice = signal('');
  readonly payerRank = payerRank;

  // Billing & Invoice.
  readonly clientBillRate = signal('');
  readonly clientPayRate = signal('');
  readonly ratesLoading = signal(false);
  readonly ratesSaving = signal(false);
  readonly ratesError = signal('');
  readonly ratesNotice = signal('');
  readonly resolved = signal<ResolvedRates | null>(null);
  readonly agencyDefaults = signal<SchedulingSettings | null>(null);

  /** The rate-resolution chain as shown on the Billing tab, in the order it is checked. */
  readonly rateChain = computed(() => {
    const rows: { label: string; bill: number | null; pay: number | null }[] = [
      { label: 'Client', bill: toRate(this.clientBillRate()), pay: toRate(this.clientPayRate()) },
    ];
    for (const p of this.payers()) {
      if (p.status && p.status !== 'Active') continue;
      const rank = payerRank(p);
      rows.push({
        label: `${rank === 'Other' ? 'Other payer' : rank + ' payer'}: ${p.payerName}`,
        bill: p.billRatePerHour,
        pay: p.payRatePerHour,
      });
    }
    const d = this.agencyDefaults();
    rows.push({
      label: 'Agency default (Settings)',
      bill: d ? d.defaultBillRatePerHour || null : null,
      pay: d ? d.defaultPayRatePerHour || null : null,
    });
    return rows;
  });

  constructor() {
    this.service.access().subscribe({ next: (a) => this.access.set(a), error: () => {} });
    this.load();
  }

  private loadedPayersForClient: number | null = null;

  loadClientPayers(): void {
    const clientId = this.clientId;

    if (!Number.isInteger(clientId) || clientId <= 0) {
      this.payersError.set('Invalid client ID.');
      this.payers.set([]);
      return;
    }

    this.payersLoading.set(true);
    this.payersError.set('');

    this.clientPayerService.getPayersByClient(clientId).subscribe({
      next: (payers) => {
        this.payers.set(payers);
        this.loadedPayersForClient = clientId;
        this.payersLoading.set(false);
      },
      error: (error: unknown) => {
        this.payers.set([]);
        this.payersError.set(error instanceof Error ? error.message : 'Failed to load client payers.');
        this.payersLoading.set(false);
      },
    });
  }

  openPayers(): void {
    this.setSection('payers');
  }

  load(): void {
    this.loading.set(true);
    this.service.get(this.clientId).subscribe({
      next: (c) => {
        this.client.set(c);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load client.');
        this.loading.set(false);
      },
    });
    this.loadVisits();
  }

  loadVisits(): void {
    this.service.schedules(this.clientId).subscribe({
      next: (v) => this.visits.set(v),
      error: () => this.visits.set([]),
    });
  }

  setSection(s: Section): void {
    this.section.set(s);
    if (s === 'payers') {
      this.loadClientPayers();
    }
    if (s === 'billing') {
      this.loadBilling();
    }
  }

  // ------------------------------------------------------------ Payers

  openAddPayer(): void {
    const form = emptyPayerForm();
    // The first payer of a client is always its primary.
    if (!this.payers().some((p) => p.isPrimary)) form.rank = 'Primary';
    else if (!this.payers().some((p) => p.isSecondary)) form.rank = 'Secondary';
    this.payerForm.set(form);
    this.payerFormError.set('');
    this.payerNotice.set('');
    this.payerFormOpen.set(true);
  }

  openEditPayer(p: ClientPayer): void {
    this.payerForm.set({
      payerId: p.payerId,
      payerName: p.payerName ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      addressLine1: p.addressLine1 ?? '',
      addressLine2: p.addressLine2 ?? '',
      city: p.city ?? '',
      state: p.state ?? '',
      postalCode: p.postalCode ?? '',
      country: p.country ?? '',
      status: p.status || 'Active',
      rank: payerRank(p),
      billRate: rateText(p.billRatePerHour),
      payRate: rateText(p.payRatePerHour),
    });
    this.payerFormError.set('');
    this.payerNotice.set('');
    this.payerFormOpen.set(true);
  }

  patchPayerForm(patch: Partial<PayerForm>): void {
    this.payerForm.update((f) => ({ ...f, ...patch }));
  }

  closePayerForm(): void {
    this.payerFormOpen.set(false);
  }

  savePayer(): void {
    const f = this.payerForm();
    if (!f.payerName.trim()) {
      this.payerFormError.set('Payer name is required.');
      return;
    }
    if ((f.billRate !== '' && Number(f.billRate) < 0) || (f.payRate !== '' && Number(f.payRate) < 0)) {
      this.payerFormError.set('Rates cannot be negative.');
      return;
    }

    const request: UpsertClientPayerRequest = {
      payerId: f.payerId,
      payerName: f.payerName.trim(),
      email: f.email.trim() || null,
      phone: f.phone.trim() || null,
      addressLine1: f.addressLine1.trim() || null,
      addressLine2: f.addressLine2.trim() || null,
      city: f.city.trim() || null,
      state: f.state.trim() || null,
      postalCode: f.postalCode.trim() || null,
      country: f.country.trim() || null,
      status: f.status,
      isPrimary: f.rank === 'Primary',
      isSecondary: f.rank === 'Secondary',
      billRatePerHour: toRate(f.billRate),
      payRatePerHour: toRate(f.payRate),
    };

    this.payerSaving.set(true);
    this.payerFormError.set('');
    const req$ = f.payerId
      ? this.clientPayerService.updatePayer(this.clientId, request)
      : this.clientPayerService.addPayer(this.clientId, request);
    req$.subscribe({
      next: (payers) => {
        this.payers.set(payers);
        this.payerSaving.set(false);
        this.payerFormOpen.set(false);
        this.payerNotice.set(f.payerId ? 'Payer saved.' : 'Payer added.');
        this.resolved.set(null);
      },
      error: (err: Error) => {
        this.payerFormError.set(err.message || 'Could not save the payer.');
        this.payerSaving.set(false);
      },
    });
  }

  rankBadge(rank: PayerRank): string {
    switch (rank) {
      case 'Primary':
        return 'bg-brand-50 text-brand-700';
      case 'Secondary':
        return 'bg-sky-50 text-sky-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  // ------------------------------------------------------- Billing & Invoice

  loadBilling(): void {
    this.ratesLoading.set(true);
    this.ratesError.set('');
    this.clientPayerService.getBillingRates(this.clientId).subscribe({
      next: (r) => {
        this.clientBillRate.set(rateText(r.billRatePerHour));
        this.clientPayRate.set(rateText(r.payRatePerHour));
        this.ratesLoading.set(false);
      },
      error: (err: Error) => {
        this.ratesError.set(err.message || 'Could not load billing rates.');
        this.ratesLoading.set(false);
      },
    });
    this.loadResolved();
    if (this.loadedPayersForClient !== this.clientId) this.loadClientPayers();
    this.scheduler.getSettings().subscribe({
      next: (s) => this.agencyDefaults.set(s),
      error: () => this.agencyDefaults.set(null),
    });
  }

  loadResolved(): void {
    this.clientPayerService.resolvedRates(this.clientId).subscribe({
      next: (r) => this.resolved.set(r),
      error: () => this.resolved.set(null),
    });
  }

  saveRates(): void {
    if (Number(this.clientBillRate()) < 0 || Number(this.clientPayRate()) < 0) {
      this.ratesError.set('Rates cannot be negative.');
      return;
    }
    this.ratesSaving.set(true);
    this.ratesError.set('');
    this.ratesNotice.set('');
    this.clientPayerService
      .updateBillingRates(this.clientId, {
        billRatePerHour: toRate(this.clientBillRate()),
        payRatePerHour: toRate(this.clientPayRate()),
      })
      .subscribe({
        next: (r) => {
          this.clientBillRate.set(rateText(r.billRatePerHour));
          this.clientPayRate.set(rateText(r.payRatePerHour));
          this.ratesSaving.set(false);
          this.ratesNotice.set('Billing rates saved.');
          this.loadResolved();
        },
        error: (err: Error) => {
          this.ratesError.set(err.message || 'Could not save billing rates.');
          this.ratesSaving.set(false);
        },
      });
  }

  // ------------------------------------------------------------ Schedule

  openEditor(date?: Date): void {
    this.editorStart.set(date ?? new Date());
    this.editorOpen.set(true);
  }

  onSaved(): void {
    this.editorOpen.set(false);
    this.loadVisits();
  }

  openCareLog(visit: ClientVisit): void {
    this.section.set('carelog');
    this.careLogVisit.set(visit);
    this.careLogEntries.set([]);
    this.careLogBusy.set(true);
    this.scheduler.careLog(visit.scheduleId).subscribe({
      next: (log) => {
        this.careLogEntries.set(log);
        this.careLogBusy.set(false);
      },
      error: () => this.careLogBusy.set(false),
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700';
      case 'OnHold':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
