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
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ClientPayer, ResolvedRates, isPayerInEffect, rankLabel } from '../../../../core/models/payer.model';
import { ClientPayerService } from '../../../../core/services/ClientPayerService';
import { ClientPayers } from '../client-payers/client-payers';

type Section = 'main' | 'schedule' | 'carelog' | 'payers' | 'billing';

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
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, Alert, VisitCalendar, ScheduleEditor, CareLog, ClientInvoices, ConfirmDialog, ClientPayers],
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

  // Portal access (Main tab).
  readonly portalBusy = signal(false);
  readonly portalNotice = signal('');
  readonly portalError = signal('');
  readonly portalConfirm = signal<'resend' | 'disable' | null>(null);

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
    // Payers in effect today, in rank order (same as the server's rate resolution).
    const today = new Date().toISOString().slice(0, 10);
    for (const p of this.payers().filter((x) => isPayerInEffect(x, today)).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))) {
      const rank = rankLabel(p.rank);
      rows.push({
        label: `${rank.startsWith('#') ? 'Payer ' + rank : rank + ' payer'}: ${p.payerName}`,
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
    if (s === 'billing') {
      this.loadBilling();
    }
  }

  // ------------------------------------------------------- Portal access

  /** Enable (creates the login and emails it to the client and payers) or disable the portal. */
  togglePortal(enabled: boolean): void {
    this.portalConfirm.set(null);
    this.portalBusy.set(true);
    this.portalNotice.set('');
    this.portalError.set('');
    this.service.setPortalAccess(this.clientId, { enabled }).subscribe({
      next: (updated) => {
        this.portalBusy.set(false);
        this.client.set(updated);
        this.portalNotice.set(enabled ? 'Portal enabled and login credentials emailed.' : 'Portal disabled.');
      },
      error: (err: Error) => {
        this.portalBusy.set(false);
        this.portalError.set(err.message || 'Could not change portal access.');
      },
    });
  }

  /** New temporary password, emailed to the client and their active payers. */
  resendCredentials(): void {
    this.portalConfirm.set(null);
    this.portalBusy.set(true);
    this.portalNotice.set('');
    this.portalError.set('');
    this.service.resendCredentials(this.clientId).subscribe({
      next: (msg) => {
        this.portalBusy.set(false);
        this.portalNotice.set(msg);
      },
      error: (err: Error) => {
        this.portalBusy.set(false);
        this.portalError.set(err.message || 'Could not resend credentials.');
      },
    });
  }

  /** The Payers tab changed the client's payers: rates resolve differently now. */
  onPayersChanged(list: ClientPayer[]): void {
    this.payers.set(list);
    this.loadedPayersForClient = this.clientId;
    this.resolved.set(null);
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
