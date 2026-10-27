/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ClientInvoice } from '../../../core/models/client-invoice.model';
import { PortalService } from '../../../core/services/portal.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { downloadClientInvoicePdf } from '../../../shared/util/client-invoice-pdf.util';

/** The signed-in client's invoices with a PDF download for each. */
@Component({
  selector: 'app-portal-invoices',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, Alert],
  templateUrl: './portal-invoices.html',
})
export class PortalInvoices {
  private readonly portal = inject(PortalService);

  readonly items = signal<ClientInvoice[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busyId = signal<number | null>(null);

  readonly amountDue = computed(() => this.items().filter((i) => i.status === 'Issued').reduce((s, i) => s + i.amount, 0));
  readonly amountPaid = computed(() => this.items().filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0));

  constructor() {
    this.portal.invoices().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your invoices.');
        this.loading.set(false);
      },
    });
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
}
