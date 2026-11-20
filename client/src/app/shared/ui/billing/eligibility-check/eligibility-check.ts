/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { fmtDate, todayYmd } from '../../../../core/models/billing.model';
import {
  EligibilityCheck,
  EligibilityResult,
  eligibilityStatusClass,
} from '../../../../core/models/claims.model';
import { ClientPayer } from '../../../../core/models/payer.model';
import { BillingSettingsService } from '../../../../core/services/billing-settings.service';
import { ClientPayerService } from '../../../../core/services/ClientPayerService';
import { EligibilityService } from '../../../../core/services/eligibility.service';

/**
 * "Check eligibility" dialog (client profile, Billing ▸ Eligibility): runs a real-time
 * check for one client payer link (or records a manual result) and shows the outcome
 * plus the link's recent history.
 */
@Component({
  selector: 'app-eligibility-check',
  imports: [FormsModule],
  templateUrl: './eligibility-check.html',
})
export class EligibilityCheckDialog implements OnInit {
  private readonly eligibility = inject(EligibilityService);
  private readonly clientPayers = inject(ClientPayerService);
  private readonly settings = inject(BillingSettingsService);

  readonly clientId = input.required<number>();
  readonly clientPayerId = input<number | null>(null);
  readonly payerName = input<string | null>(null);
  readonly closed = output<void>();

  readonly fmtDate = fmtDate;
  readonly statusClass = eligibilityStatusClass;

  readonly links = signal<ClientPayer[]>([]);
  readonly linkId = signal<number | null>(null);
  readonly link = computed(() => this.links().find((l) => l.clientPayerId === this.linkId()) ?? null);
  readonly title = computed(() => this.link()?.payerName ?? this.payerName() ?? 'Payer');

  readonly mode = signal<'check' | 'manual'>('check');
  readonly serviceDate = signal(todayYmd());
  readonly force = signal(false);
  readonly payerCode = signal('');

  // Manual entry
  readonly mStatus = signal<'Active' | 'Inactive' | 'Error'>('Active');
  readonly mPlan = signal('');
  readonly mGroup = signal('');
  readonly mStart = signal('');
  readonly mEnd = signal('');
  readonly mMessage = signal('');

  readonly busy = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);
  readonly result = signal<EligibilityResult | null>(null);
  readonly history = signal<EligibilityCheck[]>([]);
  readonly historyLoading = signal(false);

  ngOnInit(): void {
    this.linkId.set(this.clientPayerId());
    this.clientPayers.getPayersByClient(this.clientId()).subscribe({
      next: (list) => {
        this.links.set(list);
        const preset = this.linkId();
        if (preset != null && list.some((l) => l.clientPayerId === preset)) {
          this.onLink(preset);
        } else {
          const first = list.find((l) => l.isActive) ?? list[0];
          if (first) this.onLink(first.clientPayerId);
        }
      },
      error: (err: Error) => this.error.set(err.message || 'Could not load the client payers.'),
    });
  }

  onLink(id: number | null): void {
    this.linkId.set(id);
    this.result.set(null);
    this.payerCode.set('');
    const l = this.link();
    if (l) {
      // Prefill the vendor payer code from the payer's EDI id when the API exposes it.
      this.settings.payerEdi(l.payerId).subscribe({
        next: (e) => {
          if (!this.payerCode() && e.payerEdiId) this.payerCode.set(e.payerEdiId);
        },
        error: () => {},
      });
    }
    this.loadHistory();
  }

  loadHistory(): void {
    const id = this.linkId();
    if (id == null) {
      this.history.set([]);
      return;
    }
    this.historyLoading.set(true);
    this.eligibility.history(this.clientId(), id).subscribe({
      next: (h) => {
        this.history.set(h.slice(0, 10));
        this.historyLoading.set(false);
      },
      error: () => {
        this.history.set([]);
        this.historyLoading.set(false);
      },
    });
  }

  run(): void {
    const id = this.linkId();
    this.error.set('');
    this.errors.set([]);
    if (id == null) {
      this.error.set('Choose the payer to check.');
      return;
    }
    if (!this.serviceDate()) {
      this.error.set('Enter the service date.');
      return;
    }
    this.busy.set(true);
    const req$ =
      this.mode() === 'check'
        ? this.eligibility.check({
            clientId: this.clientId(),
            clientPayerId: id,
            serviceDate: this.serviceDate(),
            force: this.force(),
            payerCode: this.payerCode().trim() || null,
          })
        : this.eligibility.manual({
            clientId: this.clientId(),
            clientPayerId: id,
            serviceDate: this.serviceDate(),
            status: this.mStatus(),
            planName: this.mPlan().trim() || null,
            groupNumber: this.mGroup().trim() || null,
            coverageStart: this.mStart() || null,
            coverageEnd: this.mEnd() || null,
            message: this.mMessage().trim() || null,
          });
    req$.subscribe({
      next: (r) => {
        this.busy.set(false);
        this.result.set(r);
        this.loadHistory();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const e = apiErrorLines(err, 'The eligibility check failed.');
        this.error.set(e.message);
        this.errors.set(e.errors);
      },
    });
  }

  coverage(c: EligibilityCheck): string {
    if (!c.coverageStart && !c.coverageEnd) return '—';
    return `${c.coverageStart ? fmtDate(c.coverageStart) : '…'} – ${c.coverageEnd ? fmtDate(c.coverageEnd) : 'open'}`;
  }
}
