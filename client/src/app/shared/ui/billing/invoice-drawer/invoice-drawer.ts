/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { claimStatusClass, claimStatusLabel } from '../../../../core/models/claims.model';
import {
  ADJUSTMENT_TYPES,
  InvoiceAdjustment,
  InvoiceDetail,
  InvoiceLine,
  PaymentCreated,
  codeWithModifiers,
  fmtDate,
  fmtWallTime,
  invoiceNumberLabel,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  periodLabel,
  unitTypeLabel,
} from '../../../../core/models/billing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { BillingService } from '../../../../core/services/billing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../confirm-dialog/confirm-dialog';
import { InvoiceDialogKind, InvoiceDialogRequest, InvoiceDialogs } from '../invoice-dialogs/invoice-dialogs';
import { InvoicePdf } from '../invoice-pdf';
import { RecordPayment } from '../record-payment/record-payment';

/**
 * Invoice details (right drawer): header, lines (date, service, code + modifiers, units,
 * rate, amount, paid), payments and adjustments history, claims; actions by status.
 */
@Component({
  selector: 'app-invoice-drawer',
  imports: [RouterLink, ConfirmDialog, InvoiceDialogs, RecordPayment],
  templateUrl: './invoice-drawer.html',
})
export class InvoiceDrawer {
  private readonly billing = inject(BillingService);
  private readonly auth = inject(AuthService);
  private readonly pdf = inject(InvoicePdf);
  private readonly toast = inject(ToastService);

  readonly invoiceId = input.required<number>();
  /** null = billing Write decides. */
  readonly canManage = input<boolean | null>(null);
  readonly closed = output<void>();
  /** Emitted after an action changed the invoice (list should reload). */
  readonly changed = output<void>();

  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly fmtTime = fmtWallTime;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;
  readonly numberLabel = invoiceNumberLabel;
  readonly unitLabel = unitTypeLabel;
  readonly claimClass = claimStatusClass;
  readonly claimLabel = claimStatusLabel;

  readonly detail = signal<InvoiceDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly dialog = signal<InvoiceDialogRequest | null>(null);
  readonly paying = signal(false);
  readonly removeLine = signal<InvoiceLine | null>(null);
  readonly reverseAdj = signal<InvoiceAdjustment | null>(null);

  readonly writable = computed(() => (this.canManage() ?? true) && this.billing.canManage());
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');
  readonly inv = computed(() => this.detail()?.invoice ?? null);
  readonly status = computed(() => this.inv()?.status ?? null);
  readonly isOpen = computed(() => this.status() === 'Issued' || this.status() === 'PartiallyPaid');
  readonly isFinal = computed(() => this.isOpen() || this.status() === 'Paid');
  readonly hasModifiers = computed(() => (this.detail()?.lines ?? []).some((l) => !!l.procedureCode));
  readonly payClient = computed(() => {
    const i = this.inv();
    return i ? { clientId: i.clientId, fullName: i.clientName ?? '' } : null;
  });

  constructor() {
    this.billing.loadAccess().subscribe();
    effect(() => {
      const id = this.invoiceId();
      untracked(() => this.load(id));
    });
  }

  load(id = this.invoiceId()): void {
    this.loading.set(true);
    this.error.set('');
    this.billing.invoice(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the invoice.');
        this.loading.set(false);
      },
    });
  }

  code(l: { procedureCode: string | null; modifier1: string | null; modifier2: string | null; modifier3: string | null; modifier4: string | null }): string {
    return codeWithModifiers(l.procedureCode, l.modifier1, l.modifier2, l.modifier3, l.modifier4);
  }

  adjustmentLabel(t: string): string {
    return ADJUSTMENT_TYPES.find((x) => x.value === t)?.label ?? t;
  }

  lineDate(l: InvoiceLine): string {
    return fmtDate(l.serviceDate ?? l.serviceStartUtc);
  }

  ask(kind: InvoiceDialogKind, lineId: number | null = null): void {
    const d = this.detail();
    if (!d) return;
    this.dialog.set({ kind, invoice: d.invoice, lines: d.lines, lineId });
  }

  onDialogDone(message: string): void {
    const kind = this.dialog()?.kind;
    this.dialog.set(null);
    this.toast.success(message);
    this.changed.emit();
    if (kind === 'delete') this.closed.emit();
    else this.load();
  }

  onPaid(r: PaymentCreated): void {
    this.paying.set(false);
    this.toast.success(
      `Payment recorded: ${money(r.appliedAmount)} applied${r.unappliedAmount > 0 ? `, ${money(r.unappliedAmount)} kept as credit` : ''}.`,
    );
    this.changed.emit();
    this.load();
  }

  async openPdf(): Promise<void> {
    const i = this.inv();
    if (!i) return;
    this.busy.set(true);
    try {
      await this.pdf.open(i);
    } catch (err) {
      this.toast.error((err as Error)?.message || 'Could not open the invoice PDF.');
    }
    this.busy.set(false);
  }

  doRemoveLine(): void {
    const l = this.removeLine();
    const i = this.inv();
    if (!l || !i) return;
    this.removeLine.set(null);
    this.busy.set(true);
    this.billing.removeDraftLine(i.clientInvoiceId, l.lineId).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.changed.emit();
        if (r.invoiceDeleted) {
          this.toast.success('The last line was removed, so the draft was deleted.');
          this.closed.emit();
          return;
        }
        this.toast.success(`Line removed. Draft total ${money(r.amount)}.`);
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not remove the line.');
      },
    });
  }

  doReverseAdjustment(): void {
    const a = this.reverseAdj();
    const i = this.inv();
    if (!a || !i) return;
    this.reverseAdj.set(null);
    this.busy.set(true);
    this.billing.reverseAdjustment(i.clientInvoiceId, a.adjustmentId).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.success(`Adjustment reversed. Balance ${money(r.balance)}.`);
        this.changed.emit();
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not reverse the adjustment.');
      },
    });
  }
}
