/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { fmtDate, todayYmd } from '../../../../core/models/billing.model';
import {
  EligibilityBulkQueued,
  EligibilityCheck,
  eligibilityStatusClass,
} from '../../../../core/models/claims.model';
import { Office } from '../../../../core/models/office.model';
import { ClientPayer, PAYER_TYPES } from '../../../../core/models/payer.model';
import { BillingService } from '../../../../core/services/billing.service';
import { ClientPayerService } from '../../../../core/services/ClientPayerService';
import { EligibilityService } from '../../../../core/services/eligibility.service';
import { OfficeService } from '../../../../core/services/office.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ClientPicker, PickedClient } from '../../../../shared/ui/billing/billing-pickers';
import { EligibilityCheckDialog } from '../../../../shared/ui/billing/eligibility-check/eligibility-check';

interface LinkRow {
  link: ClientPayer;
  latest: EligibilityCheck | null;
}

/**
 * Billing ▸ Eligibility: per client, the latest result of each payer link with a
 * "Check" action (real-time or manual), the history, and a bulk check that queues
 * every active client payer link for the background worker.
 */
@Component({
  selector: 'app-billing-eligibility',
  imports: [FormsModule, ClientPicker, EligibilityCheckDialog],
  templateUrl: './billing-eligibility.html',
})
export class BillingEligibility {
  private readonly billing = inject(BillingService);
  private readonly eligibility = inject(EligibilityService);
  private readonly clientPayers = inject(ClientPayerService);
  private readonly officeService = inject(OfficeService);
  private readonly toast = inject(ToastService);

  readonly canManage = this.billing.canManage;
  readonly fmtDate = fmtDate;
  readonly statusClass = eligibilityStatusClass;
  readonly payerTypes = PAYER_TYPES;

  // Single client
  readonly client = signal<PickedClient | null>(null);
  readonly links = signal<ClientPayer[]>([]);
  readonly latest = signal<EligibilityCheck[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly rows = computed<LinkRow[]>(() => {
    const latest = this.latest();
    return this.links().map((link) => ({
      link,
      latest: latest.find((c) => c.clientPayerId === link.clientPayerId) ?? null,
    }));
  });

  readonly checkFor = signal<{ clientPayerId: number | null; payerName: string | null } | null>(null);

  // History
  readonly historyLink = signal<number | null>(null);
  readonly includeRaw = signal(false);
  readonly history = signal<EligibilityCheck[]>([]);
  readonly historyLoading = signal(false);
  readonly rawOpen = signal<number | null>(null);

  // Bulk
  readonly offices = signal<Office[]>([]);
  readonly bulkDate = signal(todayYmd());
  readonly bulkOffice = signal<string | null>(null);
  readonly bulkTypes = signal<Set<string>>(new Set(['Medicaid', 'Medicare', 'Insurance']));
  readonly bulkForce = signal(false);
  readonly bulkBusy = signal(false);
  readonly bulkResult = signal<EligibilityBulkQueued | null>(null);
  readonly bulkError = signal('');

  constructor() {
    this.officeService.list().subscribe({ next: (o) => this.offices.set(o.filter((x) => x.isActive)), error: () => {} });
  }

  onClient(c: PickedClient | null): void {
    this.client.set(c);
    this.links.set([]);
    this.latest.set([]);
    this.history.set([]);
    this.historyLink.set(null);
    if (c) this.loadClient();
  }

  loadClient(): void {
    const c = this.client();
    if (!c) return;
    this.loading.set(true);
    this.error.set('');
    this.clientPayers.getPayersByClient(c.clientId).subscribe({
      next: (l) => {
        this.links.set(l);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Could not load the client payers.');
      },
    });
    this.eligibility.latest(c.clientId).subscribe({ next: (l) => this.latest.set(l), error: () => this.latest.set([]) });
    this.loadHistory();
  }

  loadHistory(): void {
    const c = this.client();
    if (!c) return;
    this.historyLoading.set(true);
    this.eligibility.history(c.clientId, this.historyLink(), this.includeRaw()).subscribe({
      next: (h) => {
        this.history.set(h);
        this.historyLoading.set(false);
      },
      error: (err: Error) => {
        this.historyLoading.set(false);
        this.error.set(err.message || 'Could not load the eligibility history.');
      },
    });
  }

  openCheck(row: LinkRow | null): void {
    this.checkFor.set({ clientPayerId: row?.link.clientPayerId ?? null, payerName: row?.link.payerName ?? null });
  }

  onCheckClosed(): void {
    this.checkFor.set(null);
    this.loadClient();
  }

  coverage(c: EligibilityCheck | null): string {
    if (!c || (!c.coverageStart && !c.coverageEnd)) return '—';
    return `${c.coverageStart ? fmtDate(c.coverageStart) : '…'} – ${c.coverageEnd ? fmtDate(c.coverageEnd) : 'open'}`;
  }

  prettyRaw(raw: string | null | undefined): string {
    if (!raw) return '';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  // ------------------------------------------------------------------ Bulk

  toggleType(t: string): void {
    this.bulkTypes.update((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  }

  runBulk(): void {
    if (!this.bulkDate()) {
      this.bulkError.set('Enter the service date.');
      return;
    }
    this.bulkBusy.set(true);
    this.bulkError.set('');
    this.bulkResult.set(null);
    const types = [...this.bulkTypes()];
    this.eligibility
      .bulk({
        serviceDate: this.bulkDate(),
        officeId: this.bulkOffice(),
        payerTypes: types.length ? types : null,
        force: this.bulkForce(),
      })
      .subscribe({
        next: (r) => {
          this.bulkBusy.set(false);
          this.bulkResult.set(r);
          this.toast.success(`${r.queuedCount} eligibility check${r.queuedCount === 1 ? '' : 's'} queued.`);
        },
        error: (err: unknown) => {
          this.bulkBusy.set(false);
          const e = apiErrorLines(err, 'Could not queue the bulk check.');
          this.bulkError.set([e.message, ...e.errors].filter(Boolean).join(' '));
        },
      });
  }
}
