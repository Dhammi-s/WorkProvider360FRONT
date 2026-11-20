/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  Statement,
  StatementQuery,
  fmtDate,
  invoiceNumberLabel,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  periodLabel,
  todayYmd,
} from '../../../../core/models/billing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { BillingService } from '../../../../core/services/billing.service';
import { openPdfResponse } from '../../../../core/services/billing-http';
import { ClientPicker, PayerSelect, PickedClient } from '../../../../shared/ui/billing/billing-pickers';

/** Billing ▸ Statements: a client's or payer's open invoices, aging and recent payments → preview, PDF, send. */
@Component({
  selector: 'app-billing-statements',
  imports: [FormsModule, ClientPicker, PayerSelect],
  templateUrl: './billing-statements.html',
})
export class BillingStatements {
  private readonly billing = inject(BillingService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly canManage = this.billing.canManage;
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;
  readonly numberLabel = invoiceNumberLabel;

  readonly party = signal<'Client' | 'Payer'>('Client');
  readonly client = signal<PickedClient | null>(null);
  readonly payerId = signal<number | null>(null);
  readonly asOf = signal(todayYmd());

  readonly statement = signal<Statement | null>(null);
  readonly loading = signal(false);
  readonly pdfBusy = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);
  readonly notice = signal('');

  readonly sendOpen = signal(false);
  readonly toEmail = signal('');

  readonly agingBoxes = computed(() => {
    const a = this.statement()?.aging;
    if (!a) return [];
    return [
      { label: 'Current', value: a.current, cls: 'text-slate-800' },
      { label: '1–30 days', value: a.days1To30, cls: 'text-sky-700' },
      { label: '31–60 days', value: a.days31To60, cls: 'text-amber-700' },
      { label: '61–90 days', value: a.days61To90, cls: 'text-orange-700' },
      { label: '90+ days', value: a.days90Plus, cls: 'text-red-700' },
      { label: 'Total due', value: a.total, cls: 'text-slate-900' },
    ];
  });

  /** Admin / Manager payer statements need a client (payer statements span offices). */
  readonly needsClient = computed(() => this.party() === 'Payer' && !this.isSuperAdmin() && !this.client());

  readonly ready = computed(() => {
    if (!this.asOf()) return false;
    if (this.party() === 'Client') return !!this.client();
    return this.payerId() != null && !this.needsClient();
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (q.get('tab') !== 'statements') return;
      const cid = Number(q.get('clientId'));
      const pid = Number(q.get('payerId'));
      if (Number.isInteger(pid) && pid > 0) {
        this.party.set('Payer');
        this.payerId.set(pid);
      }
      if (Number.isInteger(cid) && cid > 0) {
        this.client.set({ clientId: cid, fullName: q.get('clientName') || `Client ${cid}` });
        if (!(pid > 0)) this.party.set('Client');
      }
      if (this.ready()) this.preview();
    });
  }

  setParty(p: 'Client' | 'Payer'): void {
    this.party.set(p);
    this.statement.set(null);
  }

  private query(): StatementQuery {
    return this.party() === 'Client'
      ? { clientId: this.client()?.clientId ?? null, payerId: null, asOf: this.asOf() }
      : { payerId: this.payerId(), clientId: this.client()?.clientId ?? null, asOf: this.asOf() };
  }

  private fail(err: unknown, fallback: string): void {
    const e = apiErrorLines(err, fallback);
    this.error.set(e.message);
    this.errors.set(e.errors);
  }

  preview(): void {
    if (!this.ready()) return;
    this.error.set('');
    this.errors.set([]);
    this.notice.set('');
    this.loading.set(true);
    this.billing.statement(this.query()).subscribe({
      next: (s) => {
        this.statement.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.statement.set(null);
        this.fail(err, 'Could not load the statement.');
      },
    });
  }

  pdf(): void {
    if (!this.ready()) return;
    this.pdfBusy.set(true);
    this.error.set('');
    this.billing.statementPdf(this.query()).subscribe({
      next: (res) => {
        this.pdfBusy.set(false);
        openPdfResponse(res, `statement-${this.asOf()}.pdf`);
      },
      error: (err) => {
        this.pdfBusy.set(false);
        this.fail(err, 'Could not create the statement PDF.');
      },
    });
  }

  openSend(): void {
    this.toEmail.set(this.statement()?.party.email ?? '');
    this.sendOpen.set(true);
  }

  send(): void {
    this.sendOpen.set(false);
    const s = this.statement();
    const email = this.toEmail().trim();
    const toEmail = email && email !== (s?.party.email ?? '') ? email : null;
    if (!email && !s?.party.email) {
      this.error.set('This party has no email address. Enter one to send the statement.');
      return;
    }
    this.sending.set(true);
    this.error.set('');
    this.billing.sendStatement(this.query(), toEmail).subscribe({
      next: (r) => {
        this.sending.set(false);
        this.notice.set(`Statement emailed to ${r.toEmail}.`);
      },
      error: (err) => {
        this.sending.set(false);
        this.fail(err, 'Could not send the statement.');
      },
    });
  }
}
