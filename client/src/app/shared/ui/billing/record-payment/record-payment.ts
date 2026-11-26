/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MANUAL_PAYMENT_METHODS,
  OpenInvoice,
  PaymentCreated,
  PaymentMethod,
  PaymentSourceType,
  cents,
  fmtDate,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  periodLabel,
  todayYmd,
} from '../../../../core/models/billing.model';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { PaymentsService } from '../../../../core/services/payments.service';
import { ClientPicker, PayerSelect, PickedClient } from '../billing-pickers';

interface GridRow {
  inv: OpenInvoice;
  apply: number;
}

/**
 * "Record payment" full-screen dialog: party (payer / client), method, reference, date,
 * amount and an application grid pre-filled by the server planner (oldest due first),
 * editable; the unapplied rest stays as credit. In remittance mode (payer remittance
 * entry) the party is a payer and the grid lists every client's open invoices of it.
 */
@Component({
  selector: 'app-record-payment',
  imports: [FormsModule, NgTemplateOutlet, ClientPicker, PayerSelect],
  templateUrl: './record-payment.html',
})
export class RecordPayment implements OnInit {
  private readonly payments = inject(PaymentsService);

  /** Preset party (e.g. from an invoice row). */
  readonly sourceType = input<PaymentSourceType>('Client');
  readonly payerId = input<number | null>(null);
  readonly client = input<PickedClient | null>(null);
  /** Pre-select this invoice: amount = its balance, applied to it only. */
  readonly invoiceId = input<number | null>(null);
  /** Payer remittance entry: payer only, grid grouped by client. */
  readonly remittance = input(false);
  /** Lock the party (e.g. opened from an invoice). */
  readonly lockParty = input(false);

  readonly saved = output<PaymentCreated>();
  readonly closed = output<void>();

  readonly methods = MANUAL_PAYMENT_METHODS;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;

  readonly party = signal<PaymentSourceType>('Client');
  readonly payer = signal<number | null>(null);
  readonly pickedClient = signal<PickedClient | null>(null);
  readonly method = signal<PaymentMethod>('Check');
  readonly reference = signal('');
  readonly receivedOn = signal(todayYmd());
  readonly amount = signal<number | null>(null);
  readonly note = signal('');

  readonly rows = signal<GridRow[]>([]);
  readonly loadingInvoices = signal(false);
  readonly planning = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly errors = signal<string[]>([]);
  readonly clientFilter = signal('');

  readonly hasParty = computed(() => (this.party() === 'Payer' ? this.payer() != null : this.pickedClient() != null));
  readonly applied = computed(() => cents(this.rows().reduce((s, r) => s + (Number(r.apply) || 0), 0)));
  readonly unapplied = computed(() => cents((Number(this.amount()) || 0) - this.applied()));
  readonly openTotal = computed(() => cents(this.rows().reduce((s, r) => s + r.inv.balance, 0)));
  readonly rowErrors = computed(() =>
    this.rows()
      .filter((r) => (Number(r.apply) || 0) > r.inv.balance + 0.0001 || (Number(r.apply) || 0) < 0)
      .map((r) => r.inv.clientInvoiceId),
  );
  readonly visibleRows = computed(() => {
    const f = this.clientFilter().trim().toLowerCase();
    const list = this.rows();
    return f ? list.filter((r) => (r.inv.clientName ?? '').toLowerCase().includes(f) || (r.inv.invoiceNumber ?? '').toLowerCase().includes(f)) : list;
  });
  /** Remittance mode: rows grouped by client. */
  readonly groups = computed(() => {
    const map = new Map<number, { clientId: number; clientName: string; rows: GridRow[]; balance: number; applied: number }>();
    for (const r of this.visibleRows()) {
      const g = map.get(r.inv.clientId) ?? { clientId: r.inv.clientId, clientName: r.inv.clientName ?? `Client ${r.inv.clientId}`, rows: [], balance: 0, applied: 0 };
      g.rows.push(r);
      g.balance = cents(g.balance + r.inv.balance);
      g.applied = cents(g.applied + (Number(r.apply) || 0));
      map.set(r.inv.clientId, g);
    }
    return [...map.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
  });

  ngOnInit(): void {
    this.party.set(this.remittance() ? 'Payer' : this.sourceType());
    this.payer.set(this.payerId());
    this.pickedClient.set(this.client());
    if (this.remittance()) this.method.set('EFT');
    if (this.hasParty()) this.loadOpenInvoices();
  }

  setParty(p: PaymentSourceType): void {
    if (this.party() === p) return;
    this.party.set(p);
    this.rows.set([]);
    if (this.hasParty()) this.loadOpenInvoices();
  }

  onPayer(id: number | null): void {
    this.payer.set(id);
    this.rows.set([]);
    if (id != null) this.loadOpenInvoices();
  }

  onClient(c: PickedClient | null): void {
    this.pickedClient.set(c);
    this.rows.set([]);
    if (c) this.loadOpenInvoices();
  }

  private partyIds(): { payerId: number | null; clientId: number | null } {
    return this.party() === 'Payer'
      ? { payerId: this.payer(), clientId: null }
      : { payerId: null, clientId: this.pickedClient()?.clientId ?? null };
  }

  loadOpenInvoices(): void {
    const { payerId, clientId } = this.partyIds();
    if (payerId == null && clientId == null) return;
    this.loadingInvoices.set(true);
    this.error.set('');
    this.payments.openInvoices(payerId, clientId).subscribe({
      next: (r) => {
        // A client party pays its own (private-pay) invoices; a payer its bill-to invoices.
        const list = r.invoices.filter((i) => i.balance > 0);
        const focus = this.invoiceId();
        this.rows.set(list.map((inv) => ({ inv, apply: 0 })));
        this.loadingInvoices.set(false);
        if (focus != null) {
          const row = list.find((i) => i.clientInvoiceId === focus);
          if (row && this.amount() == null) {
            this.amount.set(row.balance);
            this.rows.update((rs) => rs.map((x) => ({ ...x, apply: x.inv.clientInvoiceId === focus ? x.inv.balance : 0 })));
          }
        } else if ((Number(this.amount()) || 0) > 0) {
          this.autoApply();
        }
      },
      error: (err: Error) => {
        this.loadingInvoices.set(false);
        this.error.set(err.message || 'Could not load the open invoices.');
      },
    });
  }

  /** Planner (server): oldest due first, never above a balance. */
  autoApply(): void {
    const amt = Number(this.amount()) || 0;
    if (amt <= 0 || !this.hasParty()) return;
    const { payerId, clientId } = this.partyIds();
    this.planning.set(true);
    this.payments.propose(payerId, clientId, amt, false).subscribe({
      next: (plan) => {
        this.planning.set(false);
        const byInvoice = new Map<number, number>();
        for (const a of plan.applications) byInvoice.set(a.invoiceId, cents((byInvoice.get(a.invoiceId) ?? 0) + a.amount));
        this.rows.update((rs) => rs.map((r) => ({ ...r, apply: byInvoice.get(r.inv.clientInvoiceId) ?? 0 })));
      },
      error: () => {
        // Fall back to a local oldest-due-first plan.
        this.planning.set(false);
        let left = amt;
        this.rows.update((rs) =>
          rs.map((r) => {
            const a = cents(Math.max(0, Math.min(left, r.inv.balance)));
            left = cents(left - a);
            return { ...r, apply: a };
          }),
        );
      },
    });
  }

  clearApplications(): void {
    this.rows.update((rs) => rs.map((r) => ({ ...r, apply: 0 })));
  }

  setApply(row: GridRow, value: number | string | null): void {
    const v = value === null || value === '' ? 0 : Number(value);
    this.rows.update((rs) => rs.map((r) => (r === row ? { ...r, apply: Number.isFinite(v) ? v : 0 } : r)));
  }

  payInFull(row: GridRow): void {
    this.setApply(row, row.inv.balance);
  }

  onAmountBlur(): void {
    if (this.applied() === 0 && (Number(this.amount()) || 0) > 0) this.autoApply();
  }

  save(): void {
    this.error.set('');
    this.errors.set([]);
    const amt = cents(Number(this.amount()) || 0);
    if (!this.hasParty()) {
      this.error.set(this.party() === 'Payer' ? 'Choose the payer.' : 'Choose the client.');
      return;
    }
    if (amt <= 0) {
      this.error.set('Enter the payment amount.');
      return;
    }
    if (!this.receivedOn()) {
      this.error.set('Enter the date the payment was received.');
      return;
    }
    if (this.rowErrors().length) {
      this.error.set('An applied amount is above the invoice balance.');
      return;
    }
    if (this.unapplied() < 0) {
      this.error.set('The applied total is more than the payment amount.');
      return;
    }
    const { payerId, clientId } = this.partyIds();
    const applications = this.rows()
      .filter((r) => (Number(r.apply) || 0) > 0)
      .map((r) => ({ invoiceId: r.inv.clientInvoiceId, invoiceLineId: null, amount: cents(Number(r.apply)) }));
    this.saving.set(true);
    this.payments
      .create({
        sourceType: this.party(),
        payerId,
        clientId,
        method: this.method(),
        reference: this.reference().trim() || null,
        receivedOn: this.receivedOn(),
        amount: amt,
        note: this.note().trim() || null,
        applications,
        autoApply: false,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.saved.emit(res);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          const e = apiErrorLines(err, 'Could not record the payment.');
          this.error.set(e.message);
          this.errors.set(e.errors);
        },
      });
  }
}
