/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  MANUAL_PAYMENT_METHODS,
  OpenInvoice,
  PaymentCreated,
  PaymentDetail,
  PaymentListRow,
  PaymentMethod,
  PaymentReport,
  PaymentReportGroupBy,
  PaymentSource,
  PaymentSourceType,
  PaymentStatus,
  REFUND_METHODS,
  cents,
  fmtDate,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  monthStartYmd,
  periodLabel,
  todayYmd,
} from '../../../../core/models/billing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { BillingService } from '../../../../core/services/billing.service';
import { PaymentsService } from '../../../../core/services/payments.service';
import { ClientPicker, PayerSelect, PickedClient } from '../../../../shared/ui/billing/billing-pickers';
import { RecordPayment } from '../../../../shared/ui/billing/record-payment/record-payment';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Paginator } from '../../../../shared/ui/paginator/paginator';

interface ApplyRow {
  inv: OpenInvoice;
  apply: number;
}

/**
 * Billing ▸ Payments: payments list with filters and totals, record payment / payer
 * remittance entry, payment detail (applications, refunds) with apply credit,
 * reverse (SuperAdmin) and refund; plus a payments report.
 */
@Component({
  selector: 'app-billing-payments',
  imports: [FormsModule, Paginator, ConfirmDialog, ClientPicker, PayerSelect, RecordPayment],
  templateUrl: './billing-payments.html',
})
export class BillingPayments {
  private readonly billing = inject(BillingService);
  private readonly payments = inject(PaymentsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = this.billing.canManage;
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly invStatusClass = invoiceStatusClass;
  readonly invStatusLabel = invoiceStatusLabel;
  readonly allMethods: PaymentMethod[] = ['Check', 'EFT', 'ACH', 'Card', 'Cash', 'ERA', 'Online', 'Legacy', 'Other'];
  readonly sources: PaymentSource[] = ['Manual', 'ERA', 'Stripe', 'Backfill'];
  readonly refundMethods = REFUND_METHODS;
  readonly manualMethods = MANUAL_PAYMENT_METHODS;

  readonly view = signal<'list' | 'report'>('list');

  // ---------------------------------------------------------------- List
  readonly items = signal<PaymentListRow[]>([]);
  readonly total = signal(0);
  readonly totalAmount = signal(0);
  readonly totalUnapplied = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');

  readonly sourceType = signal<PaymentSourceType | ''>('');
  readonly payerId = signal<number | null>(null);
  readonly client = signal<PickedClient | null>(null);
  readonly method = signal<PaymentMethod | ''>('');
  readonly source = signal<PaymentSource | ''>('');
  readonly status = signal<PaymentStatus | ''>('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly onlyUnapplied = signal(false);
  readonly search = signal('');
  private readonly search$ = new Subject<string>();

  // ---------------------------------------------------------------- Record payment
  readonly recordOpen = signal<'payment' | 'remittance' | null>(null);

  // ---------------------------------------------------------------- Detail
  readonly detailId = signal<number | null>(null);
  readonly detail = signal<PaymentDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly detailErrors = signal<string[]>([]);
  readonly busy = signal(false);

  // Apply credit
  readonly applyOpen = signal(false);
  readonly applyRows = signal<ApplyRow[]>([]);
  readonly applyLoading = signal(false);
  readonly applyTotal = computed(() => cents(this.applyRows().reduce((s, r) => s + (Number(r.apply) || 0), 0)));
  readonly confirmAutoApply = signal(false);

  // Reverse
  readonly reverseOpen = signal(false);
  readonly reverseReason = signal('');

  // Refund
  readonly refundOpen = signal(false);
  readonly refundAmount = signal<number | null>(null);
  readonly refundMethod = signal<PaymentMethod>('Check');
  readonly refundReference = signal('');
  readonly refundOn = signal(todayYmd());
  readonly refundNote = signal('');

  // ---------------------------------------------------------------- Report
  readonly reportFrom = signal(monthStartYmd(0));
  readonly reportTo = signal(todayYmd());
  readonly reportGroupBy = signal<PaymentReportGroupBy>('Method');
  readonly report = signal<PaymentReport | null>(null);
  readonly reportLoading = signal(false);
  readonly reportError = signal('');
  readonly reportTotals = computed(() => {
    const g = this.report()?.groups ?? [];
    return {
      count: g.reduce((s, x) => s + x.paymentCount, 0),
      amount: cents(g.reduce((s, x) => s + x.amount, 0)),
      applied: cents(g.reduce((s, x) => s + x.appliedAmount, 0)),
      unapplied: cents(g.reduce((s, x) => s + x.unappliedAmount, 0)),
      refunded: cents(g.reduce((s, x) => s + x.refundedAmount, 0)),
    };
  });

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.payments
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        sourceType: this.sourceType(),
        payerId: this.payerId(),
        clientId: this.client()?.clientId ?? null,
        method: this.method(),
        source: this.source(),
        status: this.status(),
        fromDate: this.fromDate() || null,
        toDate: this.toDate() || null,
        onlyUnapplied: this.onlyUnapplied(),
        search: this.search().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.totalAmount.set(r.totalAmount);
          this.totalUnapplied.set(r.totalBalance);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load payments.');
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  onSearch(q: string): void {
    this.search.set(q);
    this.search$.next(q);
  }

  resetFilters(): void {
    this.sourceType.set('');
    this.payerId.set(null);
    this.client.set(null);
    this.method.set('');
    this.source.set('');
    this.status.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.onlyUnapplied.set(false);
    this.search.set('');
    this.applyFilters();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSize(n: number): void {
    this.pageSize.set(n);
    this.applyFilters();
  }

  partyName(p: { sourceType: PaymentSourceType; payerName: string | null; clientName: string | null }): string {
    return p.sourceType === 'Payer' ? p.payerName || 'Payer' : p.clientName || 'Client';
  }

  // ---------------------------------------------------------------- Record payment

  onRecorded(res: PaymentCreated): void {
    this.recordOpen.set(null);
    this.notice.set(
      res.isDuplicate
        ? `This payment was already recorded (#${res.paymentId}).`
        : `Payment #${res.paymentId} recorded: ${money(res.appliedAmount)} applied, ${money(res.unappliedAmount)} unapplied.`,
    );
    this.load();
  }

  // ---------------------------------------------------------------- Detail

  openDetail(p: PaymentListRow | { paymentId: number }): void {
    this.detailId.set(p.paymentId);
    this.applyOpen.set(false);
    this.loadDetail();
  }

  loadDetail(): void {
    const id = this.detailId();
    if (id == null) return;
    this.detailLoading.set(true);
    this.detailError.set('');
    this.detailErrors.set([]);
    this.payments.get(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
      },
      error: (err: Error) => {
        this.detailLoading.set(false);
        this.detailError.set(err.message || 'Could not load the payment.');
      },
    });
  }

  closeDetail(): void {
    this.detailId.set(null);
    this.detail.set(null);
    this.applyOpen.set(false);
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(false);
    const e = apiErrorLines(err, fallback);
    this.detailError.set(e.message);
    this.detailErrors.set(e.errors);
  }

  private afterChange(msg: string): void {
    this.busy.set(false);
    this.notice.set(msg);
    this.loadDetail();
    this.load();
  }

  // Apply credit -----------------------------------------------------

  doAutoApply(): void {
    const d = this.detail();
    this.confirmAutoApply.set(false);
    if (!d) return;
    this.busy.set(true);
    this.payments.apply(d.payment.paymentId, null, true).subscribe({
      next: (r) => this.afterChange(`Credit applied: ${money(r.appliedAmount)} applied, ${money(r.unappliedAmount)} left.`),
      error: (err) => this.fail(err, 'Could not apply the credit.'),
    });
  }

  openApplyGrid(): void {
    const d = this.detail();
    if (!d) return;
    const p = d.payment;
    this.applyOpen.set(true);
    this.applyLoading.set(true);
    const payerId = p.sourceType === 'Payer' ? p.payerId : null;
    const clientId = p.sourceType === 'Client' ? p.clientId : null;
    this.payments.openInvoices(payerId, clientId).subscribe({
      next: (r) => {
        this.applyRows.set(r.invoices.filter((i) => i.balance > 0).map((inv) => ({ inv, apply: 0 })));
        this.applyLoading.set(false);
      },
      error: (err) => {
        this.applyLoading.set(false);
        this.fail(err, 'Could not load the open invoices.');
      },
    });
  }

  setApply(row: ApplyRow, value: number | string | null): void {
    const v = value === null || value === '' ? 0 : Number(value);
    this.applyRows.update((rs) => rs.map((r) => (r === row ? { ...r, apply: Number.isFinite(v) ? v : 0 } : r)));
  }

  saveApply(): void {
    const d = this.detail();
    if (!d) return;
    const apps = this.applyRows()
      .filter((r) => (Number(r.apply) || 0) > 0)
      .map((r) => ({ invoiceId: r.inv.clientInvoiceId, invoiceLineId: null, amount: cents(Number(r.apply)) }));
    if (!apps.length) {
      this.detailError.set('Enter an amount on at least one invoice.');
      return;
    }
    if (this.applyRows().some((r) => (Number(r.apply) || 0) > r.inv.balance + 0.0001)) {
      this.detailError.set('An applied amount is above the invoice balance.');
      return;
    }
    if (this.applyTotal() > d.payment.unappliedAmount + 0.0001) {
      this.detailError.set(`Only ${money(d.payment.unappliedAmount)} is unapplied.`);
      return;
    }
    this.busy.set(true);
    this.payments.apply(d.payment.paymentId, apps, false).subscribe({
      next: (r) => {
        this.applyOpen.set(false);
        this.afterChange(`Credit applied: ${money(r.appliedAmount)} applied, ${money(r.unappliedAmount)} left.`);
      },
      error: (err) => this.fail(err, 'Could not apply the credit.'),
    });
  }

  // Reverse ----------------------------------------------------------

  openReverse(): void {
    this.reverseReason.set('');
    this.reverseOpen.set(true);
  }

  doReverse(): void {
    const d = this.detail();
    const reason = this.reverseReason().trim();
    if (!d || !reason) return;
    this.reverseOpen.set(false);
    this.busy.set(true);
    this.payments.reverse(d.payment.paymentId, reason).subscribe({
      next: () => this.afterChange(`Payment #${d.payment.paymentId} reversed; the invoice balances were restored.`),
      error: (err) => this.fail(err, 'Could not reverse the payment.'),
    });
  }

  // Refund -----------------------------------------------------------

  openRefund(): void {
    const d = this.detail();
    if (!d) return;
    this.refundAmount.set(d.payment.unappliedAmount);
    this.refundMethod.set(d.payment.method === 'Online' ? 'Online' : 'Check');
    this.refundReference.set('');
    this.refundOn.set(todayYmd());
    this.refundNote.set('');
    this.refundOpen.set(true);
  }

  readonly refundError = computed(() => {
    const d = this.detail();
    const a = Number(this.refundAmount()) || 0;
    if (a <= 0) return 'Enter the refund amount.';
    if (d && a > d.payment.unappliedAmount + 0.0001) return `At most ${money(d.payment.unappliedAmount)} (the unapplied credit) can be refunded.`;
    if (!this.refundOn()) return 'Enter the refund date.';
    return '';
  });

  doRefund(): void {
    const d = this.detail();
    if (!d || this.refundError()) return;
    this.refundOpen.set(false);
    this.busy.set(true);
    this.payments
      .refund(d.payment.paymentId, {
        amount: cents(Number(this.refundAmount())),
        method: this.refundMethod(),
        reference: this.refundReference().trim() || null,
        refundedOn: this.refundOn(),
        note: this.refundNote().trim() || null,
      })
      .subscribe({
        next: (r) => this.afterChange(`Refund of ${money(r.refundedAmount)} recorded.`),
        error: (err) => this.fail(err, 'Could not record the refund.'),
      });
  }

  // ---------------------------------------------------------------- Report

  setView(v: 'list' | 'report'): void {
    this.view.set(v);
    if (v === 'report' && !this.report()) this.loadReport();
  }

  loadReport(): void {
    if (!this.reportFrom() || !this.reportTo() || this.reportTo() < this.reportFrom()) {
      this.reportError.set('Pick a valid period.');
      return;
    }
    this.reportLoading.set(true);
    this.reportError.set('');
    this.payments.report(this.reportFrom(), this.reportTo(), this.reportGroupBy()).subscribe({
      next: (r) => {
        this.report.set(r);
        this.reportLoading.set(false);
      },
      error: (err: Error) => {
        this.reportLoading.set(false);
        this.reportError.set(err.message || 'Could not load the report.');
      },
    });
  }
}
