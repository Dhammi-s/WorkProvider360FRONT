/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/models/api-response.model';
import { BillingService } from '../../../core/services/billing.service';
import { ClientInvoiceService } from '../../../core/services/client-invoice.service';
import { openPdfResponse } from '../../../core/services/billing-http';
import { downloadClientInvoicePdf } from '../../util/client-invoice-pdf.util';

/**
 * Invoice PDF: the server-rendered PDF (GET billing/invoices/{id}/pdf). Only when that
 * endpoint is not available (404 / 405 / 501, e.g. an older API) the browser-built PDF
 * of the legacy client-invoice endpoint is used as a fallback.
 */
@Injectable({ providedIn: 'root' })
export class InvoicePdf {
  private readonly billing = inject(BillingService);
  private readonly legacy = inject(ClientInvoiceService);

  async open(inv: { clientInvoiceId: number; invoiceNumber: string | null }): Promise<void> {
    const name = `${inv.invoiceNumber || 'invoice-' + inv.clientInvoiceId}.pdf`;
    try {
      const res = await firstValueFrom(this.billing.invoicePdf(inv.clientInvoiceId));
      openPdfResponse(res, name);
    } catch (err) {
      const status = (err as ApiError)?.status;
      if (status === 404 || status === 405 || status === 501) {
        const detail = await firstValueFrom(this.legacy.get(inv.clientInvoiceId));
        await downloadClientInvoicePdf(detail);
        return;
      }
      throw err;
    }
  }
}
