/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientInvoice } from '../../../core/models/client-invoice.model';
import { fmtDate, invoiceStatusClass, periodLabel, todayYmd } from '../../../core/models/billing.model';
import { PortalService } from '../../../core/services/portal.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { downloadClientInvoicePdf } from '../../../shared/util/client-invoice-pdf.util';

/**
 * The signed-in client's invoices: status, balance, a PDF download for each and
 * "Pay online" (Stripe Checkout) when the agency takes online payments for it.
 */
@Component({
  selector: 'app-portal-invoices',
  imports: [CurrencyPipe, DecimalPipe, Alert],
  templateUrl: './portal-invoices.html',
})
export class PortalInvoices {
  private readonly portal = inject(PortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly items = signal<ClientInvoice[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly info = signal('');
  readonly busyId = signal<number | null>(null);
  readonly payingId = signal<number | null>(null);

  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  private readonly today = todayYmd();

  readonly amountDue = computed(() =>
    this.items()
      .filter((i) => this.isOpen(i))
      .reduce((s, i) => s + this.balanceOf(i), 0),
  );
  readonly amountPaid = computed(() =>
    this.items().reduce((s, i) => s + (i.amountPaid ?? (i.status === 'Paid' ? i.amount : 0)), 0),
  );

  constructor() {
    // Back from Stripe Checkout (API default return URL: /portal/invoices?payment=success|cancelled).
    const payment = this.route.snapshot.queryParamMap.get('payment');
    if (payment === 'success') this.notice.set('Thank you! Your payment was received. It can take a minute to show on the invoice.');
    else if (payment === 'cancelled') this.info.set('Payment cancelled. No payment was taken.');
    if (payment) this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.load();
  }

  load(): void {
    this.portal.invoices().subscribe({
      next: (list) => {
        this.items.set(list.filter((i) => i.status !== 'Draft' && i.status !== 'Void'));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your invoices.');
        this.loading.set(false);
      },
    });
  }

  isOpen(i: ClientInvoice): boolean {
    return i.status === 'Issued' || i.status === 'PartiallyPaid';
  }

  balanceOf(i: ClientInvoice): number {
    return i.balance ?? (this.isOpen(i) ? i.amount : 0);
  }

  statusText(i: ClientInvoice): string {
    switch (i.status) {
      case 'Paid':
        return 'Paid';
      case 'PartiallyPaid':
        return 'Partly paid';
      default:
        return 'Due';
    }
  }

  isOverdue(i: ClientInvoice): boolean {
    const due = (i.dueDate ?? '').slice(0, 10);
    return this.isOpen(i) && !!due && due < this.today && this.balanceOf(i) > 0;
  }

  downloadPdf(inv: ClientInvoice): void {
    this.busyId.set(inv.clientInvoiceId);
    this.error.set('');
    this.portal.invoice(inv.clientInvoiceId).subscribe({
      next: async (detail) => {
        try {
          await downloadClientInvoicePdf(detail, { showApproval: false });
        } catch {
          this.error.set('Could not create the PDF. Please try again.');
        }
        this.busyId.set(null);
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.error.set(err.message || 'Could not load the invoice.');
      },
    });
  }

  /** Starts Stripe Checkout for the current balance and leaves the app for the payment page. */
  payOnline(inv: ClientInvoice): void {
    this.payingId.set(inv.clientInvoiceId);
    this.error.set('');
    this.portal.checkout(inv.clientInvoiceId).subscribe({
      next: (r) => {
        window.location.href = r.url;
      },
      error: (err: Error) => {
        this.payingId.set(null);
        this.error.set(err.message || 'Could not start the online payment. Please try again later.');
      },
    });
  }
}
