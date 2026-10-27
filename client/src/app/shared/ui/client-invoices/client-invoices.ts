/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { Client } from '../../../core/models/client.model';
import {
  ClientInvoice,
  ClientInvoicePreview,
  ClientInvoiceStatus,
} from '../../../core/models/client-invoice.model';
import { ClientService } from '../../../core/services/client.service';
import { ClientInvoiceService } from '../../../core/services/client-invoice.service';
import { ApprovalPrompt, buildApprovalPrompt } from '../../util/approval-prompt.util';
import { downloadClientInvoicePdf } from '../../util/client-invoice-pdf.util';
import { Alert } from '../alert/alert';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Client invoices: preview a period's schedules, create the invoice (approved
 * schedules only unless the caller's role may include unapproved ones, with a
 * popup either way), list invoices, download the PDF, mark paid / void.
 * With [clientId] it is locked to that client (Billing & Invoice tab); without
 * it shows a client picker and lists every client's invoices (Accounting).
 */
@Component({
  selector: 'app-client-invoices',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule, Alert, ConfirmDialog],
  templateUrl: './client-invoices.html',
})
export class ClientInvoices {
  private readonly service = inject(ClientInvoiceService);
  private readonly clients = inject(ClientService);

  readonly clientId = input<number | null>(null);
  readonly canManage = input(false);

  // Client picker (Accounting only).
  readonly pickedClient = signal<Client | null>(null);
  readonly clientQuery = signal('');
  readonly clientOptions = signal<Client[]>([]);
  private readonly clientSearch$ = new Subject<string>();

  readonly selectedClientId = computed(() => this.clientId() ?? this.pickedClient()?.clientId ?? null);
  readonly showClientColumn = computed(() => this.clientId() == null);

  readonly from = signal(ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly to = signal(ymd(new Date()));
  readonly notes = signal('');

  readonly preview = signal<ClientInvoicePreview | null>(null);
  readonly previewLoading = signal(false);
  readonly creating = signal(false);

  readonly invoices = signal<ClientInvoice[]>([]);
  readonly invoicesLoading = signal(false);
  readonly busyId = signal<number | null>(null);

  readonly notice = signal('');
  readonly error = signal('');

  /** Unapproved-schedules popup. */
  readonly prompt = signal<ApprovalPrompt | null>(null);
  /** Void confirmation popup. */
  readonly voidTarget = signal<ClientInvoice | null>(null);

  constructor() {
    this.clientSearch$.pipe(debounceTime(300)).subscribe((q) => {
      if (!q.trim()) {
        this.clientOptions.set([]);
        return;
      }
      this.clients.list(1, 8, { search: q.trim() }).subscribe({
        next: (res) => this.clientOptions.set(res.items),
        error: () => this.clientOptions.set([]),
      });
    });

    // (Re)load the list whenever the locked client changes.
    effect(() => {
      this.clientId();
      untracked(() => this.loadInvoices());
    });
  }

  // ---------------------------------------------------------- Client picker

  searchClients(q: string): void {
    this.clientQuery.set(q);
    this.clientSearch$.next(q);
  }

  pickClient(c: Client): void {
    this.pickedClient.set(c);
    this.clientQuery.set('');
    this.clientOptions.set([]);
    this.preview.set(null);
  }

  clearClient(): void {
    this.pickedClient.set(null);
    this.preview.set(null);
  }

  // ---------------------------------------------------------------- Data

  loadInvoices(): void {
    this.invoicesLoading.set(true);
    this.service.list(this.clientId() ?? undefined).subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.invoicesLoading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load invoices.');
        this.invoicesLoading.set(false);
      },
    });
  }

  private period(): { fromUtc: string; toUtc: string } | null {
    if (!this.from() || !this.to() || this.to() < this.from()) {
      this.error.set('Pick a valid period: the end date must be on or after the start date.');
      return null;
    }
    // Schedules are stored as the times typed in the scheduler, so no time-zone shift here.
    return { fromUtc: `${this.from()}T00:00:00`, toUtc: `${this.to()}T23:59:59` };
  }

  loadPreview(): void {
    this.error.set('');
    this.notice.set('');
    const cid = this.selectedClientId();
    if (cid == null) {
      this.error.set('Choose a client first.');
      return;
    }
    const p = this.period();
    if (!p) return;
    this.previewLoading.set(true);
    this.service.preview(cid, p.fromUtc, p.toUtc).subscribe({
      next: (r) => {
        this.preview.set(r);
        this.previewLoading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the schedules to invoice.');
        this.previewLoading.set(false);
      },
    });
  }

  // --------------------------------------------------------------- Create

  /** Create from the preview; unapproved schedules open the approval popup first. */
  createInvoice(): void {
    const pv = this.preview();
    if (!pv || pv.lines.length === 0) return;
    const prompt = buildApprovalPrompt({
      approved: pv.approvedCount,
      unapproved: pv.unapprovedCount,
      canInvoiceUnapproved: pv.canInvoiceUnapproved,
      approvedAmount: usd.format(pv.approvedAmount),
      totalAmount: usd.format(pv.totalAmount),
    });
    if (prompt) {
      this.prompt.set(prompt);
      return;
    }
    this.doCreate(false);
  }

  promptInvoiceAll(): void {
    this.prompt.set(null);
    this.doCreate(true);
  }

  promptApprovedOnly(): void {
    this.prompt.set(null);
    this.doCreate(false);
  }

  private doCreate(includeUnapproved: boolean): void {
    const pv = this.preview();
    if (!pv) return;
    this.creating.set(true);
    this.error.set('');
    this.service
      .create({
        clientId: pv.clientId,
        fromUtc: pv.fromUtc,
        toUtc: pv.toUtc,
        includeUnapproved,
        notes: this.notes().trim() || null,
      })
      .subscribe({
        next: (inv) => {
          this.creating.set(false);
          this.notice.set(`Invoice ${inv.invoiceNumber} created for ${usd.format(inv.amount)}.`);
          this.preview.set(null);
          this.notes.set('');
          this.loadInvoices();
        },
        error: (err: Error) => {
          this.creating.set(false);
          this.error.set(err.message || 'Could not create the invoice.');
        },
      });
  }

  // ------------------------------------------------------------- Actions

  downloadPdf(inv: ClientInvoice): void {
    this.busyId.set(inv.clientInvoiceId);
    this.service.get(inv.clientInvoiceId).subscribe({
      next: async (detail) => {
        try {
          await downloadClientInvoicePdf(detail);
        } catch {
          this.error.set('Could not generate the invoice PDF.');
        }
        this.busyId.set(null);
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.error.set(err.message || 'Could not load the invoice.');
      },
    });
  }

  setStatus(inv: ClientInvoice, status: ClientInvoiceStatus): void {
    this.voidTarget.set(null);
    this.busyId.set(inv.clientInvoiceId);
    this.error.set('');
    this.service.setStatus(inv.clientInvoiceId, status).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.notice.set(`Invoice ${updated.invoiceNumber} marked ${updated.status.toLowerCase()}.`);
        this.loadInvoices();
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.error.set(err.message || 'Could not update the invoice.');
      },
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700';
      case 'Void':
        return 'bg-slate-100 text-slate-500 line-through';
      default:
        return 'bg-indigo-50 text-indigo-700';
    }
  }
}
