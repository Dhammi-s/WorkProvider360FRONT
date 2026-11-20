/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError, apiErrorLines } from '../../../../core/models/api-response.model';
import {
  ADJUSTMENT_TYPES,
  AdjustmentType,
  InvoiceLine,
  InvoiceListRow,
  cents,
  codeWithModifiers,
  fmtDate,
  invoiceNumberLabel,
  money,
} from '../../../../core/models/billing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { BillingService } from '../../../../core/services/billing.service';

export type InvoiceDialogKind = 'finalize' | 'send' | 'void' | 'adjust' | 'delete';

export interface InvoiceDialogRequest {
  kind: InvoiceDialogKind;
  invoice: InvoiceListRow;
  /** Adjust: the invoice's lines (optional; enables the line picker). */
  lines?: InvoiceLine[];
  /** Adjust: preselected line. */
  lineId?: number | null;
}

/**
 * The confirm / form popups of an invoice action: finalize, send (email + PDF),
 * void (reason; explains when payments block it), adjust (type / amount / line /
 * reason code / note) and delete draft. Emits done(message) after a successful call.
 */
@Component({
  selector: 'app-invoice-dialogs',
  imports: [FormsModule],
  templateUrl: './invoice-dialogs.html',
})
export class InvoiceDialogs implements OnInit {
  private readonly billing = inject(BillingService);
  private readonly auth = inject(AuthService);

  readonly request = input.required<InvoiceDialogRequest>();
  readonly done = output<string>();
  readonly closed = output<void>();

  readonly adjustmentTypes = ADJUSTMENT_TYPES;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly code = codeWithModifiers;
  readonly numberLabel = invoiceNumberLabel;

  readonly busy = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);
  /** Void refused because payments / adjustments are applied (409). */
  readonly blocked = signal(false);

  // Send
  readonly toEmail = signal('');
  readonly message = signal('');
  // Void
  readonly reason = signal('');
  // Adjust
  readonly adjType = signal<AdjustmentType>('WriteOff');
  readonly adjAmount = signal<number | null>(null);
  readonly adjLineId = signal<number | null>(null);
  readonly adjGroupCode = signal('');
  readonly adjReasonCode = signal('');
  readonly adjNote = signal('');

  readonly inv = computed(() => this.request().invoice);
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly threshold = computed(() => this.billing.access()?.writeOffApprovalThreshold ?? null);
  readonly needsApproval = computed(() => {
    const t = this.threshold();
    return this.adjType() === 'WriteOff' && t != null && Math.abs(Number(this.adjAmount()) || 0) > t && !this.isSuperAdmin();
  });
  readonly serviceLines = computed(() => (this.request().lines ?? []).filter((l) => l.amount !== 0));
  readonly selectedLine = computed(() => this.serviceLines().find((l) => l.lineId === this.adjLineId()) ?? null);

  ngOnInit(): void {
    const r = this.request();
    this.toEmail.set('');
    this.adjLineId.set(r.lineId ?? null);
  }

  title(): string {
    const label = this.numberLabel(this.inv());
    switch (this.request().kind) {
      case 'finalize':
        return 'Finalize this invoice?';
      case 'send':
        return `Send invoice ${label}`;
      case 'void':
        return `Void invoice ${label}`;
      case 'adjust':
        return `Adjust invoice ${label}`;
      case 'delete':
        return 'Delete this draft?';
    }
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(false);
    const e = apiErrorLines(err, fallback);
    this.error.set(e.message);
    this.errors.set(e.errors);
  }

  submit(): void {
    this.error.set('');
    this.errors.set([]);
    const inv = this.inv();
    switch (this.request().kind) {
      case 'finalize':
        this.busy.set(true);
        this.billing.finalize(inv.clientInvoiceId).subscribe({
          next: (r) => {
            const f = r.invoices[0];
            const parts = [`Invoice ${f?.invoiceNumber ?? ''} issued${f ? ', due ' + fmtDate(f.dueDate) : ''}.`];
            if (r.claimsCreated) parts.push(`${r.claimsCreated} claim${r.claimsCreated === 1 ? '' : 's'} created.`);
            if (r.warnings.length) parts.push(r.warnings.join(' '));
            this.done.emit(parts.join(' '));
          },
          error: (err) => this.fail(err, 'Could not finalize the invoice.'),
        });
        return;
      case 'send':
        this.busy.set(true);
        this.billing.send(inv.clientInvoiceId, this.toEmail().trim() || null, this.message().trim() || null).subscribe({
          next: (r) =>
            this.done.emit(`Invoice sent to ${r.toEmail}${r.payLinkIncluded ? ' with a Pay online link' : ''}.`),
          error: (err) => this.fail(err, 'Could not send the invoice.'),
        });
        return;
      case 'void': {
        const reason = this.reason().trim();
        if (!reason) {
          this.error.set('Enter the reason for voiding.');
          return;
        }
        this.busy.set(true);
        this.blocked.set(false);
        this.billing.voidInvoice(inv.clientInvoiceId, reason).subscribe({
          next: (r) => {
            let msg = `Invoice ${this.numberLabel(inv)} voided; its visits can be billed again.`;
            if (r.voidedClaimCount) msg += ` ${r.voidedClaimCount} claim(s) voided.`;
            if (r.openClaimCount) msg += ` ${r.openClaimCount} claim(s) were already sent to the payer — void them in Billing ▸ Claims.`;
            this.done.emit(msg);
          },
          error: (err) => {
            if ((err as ApiError)?.status === 409) this.blocked.set(true);
            this.fail(err, 'Could not void the invoice.');
          },
        });
        return;
      }
      case 'adjust': {
        const amount = cents(Number(this.adjAmount()) || 0);
        if (!amount) {
          this.error.set('Enter the adjustment amount (positive reduces the balance; a Debit is negative).');
          return;
        }
        if (this.adjType() === 'Debit' && amount > 0) {
          this.error.set('A Debit increases the balance: enter it as a negative amount.');
          return;
        }
        if (this.adjType() !== 'Debit' && amount > inv.balance + 0.0001) {
          this.error.set(`The adjustment is more than the balance (${money(inv.balance)}).`);
          return;
        }
        this.busy.set(true);
        this.billing
          .adjust(inv.clientInvoiceId, {
            invoiceLineId: this.adjLineId(),
            adjustmentType: this.adjType(),
            amount,
            groupCode: this.adjGroupCode().trim().toUpperCase() || null,
            reasonCode: this.adjReasonCode().trim().toUpperCase() || null,
            note: this.adjNote().trim() || null,
          })
          .subscribe({
            next: (r) => this.done.emit(`Adjustment saved. New balance ${money(r.balance)}.`),
            error: (err) => this.fail(err, 'Could not save the adjustment.'),
          });
        return;
      }
      case 'delete':
        this.busy.set(true);
        this.billing.deleteDraft(inv.clientInvoiceId).subscribe({
          next: () => this.done.emit('Draft deleted; its visits can be billed again.'),
          error: (err) => this.fail(err, 'Could not delete the draft.'),
        });
        return;
    }
  }
}
