/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import {
  BillToType,
  INVOICE_STATUSES,
  InvoiceListRow,
  InvoiceStatus,
  PaymentCreated,
  fmtDate,
  invoiceNumberLabel,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  periodLabel,
  todayYmd,
} from '../../../core/models/billing.model';
import { BillingService } from '../../../core/services/billing.service';
import { ToastService } from '../../../core/services/toast.service';
import { Alert } from '../alert/alert';
import { ClientPicker, PayerSelect, PickedClient } from '../billing/billing-pickers';
import { InvoiceDialogKind, InvoiceDialogRequest, InvoiceDialogs } from '../billing/invoice-dialogs/invoice-dialogs';
import { InvoiceDrawer } from '../billing/invoice-drawer/invoice-drawer';
import { InvoicePdf } from '../billing/invoice-pdf';
import { RecordPayment } from '../billing/record-payment/record-payment';
import { Paginator } from '../paginator/paginator';

interface PaymentTarget {
  invoice: InvoiceListRow;
  client: PickedClient;
}

/**
 * Invoices list (Billing ▸ Invoices, client profile Billing tab, Accounting ▸ Client
 * invoices, aging drill-down). Filters, totals, status pills and actions per status:
 * finalize, send, PDF, record payment, adjust, void (reason), delete draft; the detail
 * drawer has the lines, payments and adjustments. New invoices are made by invoice runs.
 *
 * mode 'full' shows every filter; 'compact' is for embedding ([clientId] / [payerId] fixed).
 */
@Component({
  selector: 'app-client-invoices',
  standalone: true,
  imports: [FormsModule, Alert, Paginator, ClientPicker, PayerSelect, InvoiceDialogs, InvoiceDrawer, RecordPayment],
  templateUrl: './client-invoices.html',
})
export class ClientInvoices {
  private readonly billing = inject(BillingService);
  private readonly pdf = inject(InvoicePdf);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Show only this client's invoices (client profile). */
  readonly clientId = input<number | null>(null);
  /** Client name, used for the "New invoices" shortcut. */
  readonly clientName = input<string | null>(null);
  /** Show only this payer's invoices (aging drill-down). */
  readonly payerId = input<number | null>(null);
  /** The host's own permission (e.g. client Write); billing Write is also required. */
  readonly canManage = input(false);
  readonly mode = input<'full' | 'compact'>('compact');
  /** Start with "Has balance" on. */
  readonly onlyOpen = input(false);

  readonly access = this.billing.access;
  readonly writable = computed(() => this.canManage() && this.billing.canManage());
  readonly full = computed(() => this.mode() === 'full');
  readonly showClientColumn = computed(() => this.clientId() == null);
  /** Billing access is known to be None: the list is not available. */
  readonly noAccess = computed(() => {
    const a = this.access();
    return !!a && (a.accessLevel === 'None' || !a.canView);
  });

  readonly statuses = INVOICE_STATUSES;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;
  readonly numberLabel = invoiceNumberLabel;
  readonly today = todayYmd();

  // Filters
  readonly status = signal<InvoiceStatus | ''>('');
  readonly billToType = signal<BillToType | ''>('');
  readonly payerFilter = signal<number | null>(null);
  readonly clientFilter = signal<PickedClient | null>(null);
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly hasBalance = signal(false);
  readonly overdueOnly = signal(false);
  readonly search = signal('');
  private readonly search$ = new Subject<string>();

  // Data
  readonly items = signal<InvoiceListRow[]>([]);
  readonly total = signal(0);
  readonly totalAmount = signal(0);
  readonly totalBalance = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly busyId = signal<number | null>(null);

  // Selection (drafts → finalize selected)
  readonly selected = signal<Set<number>>(new Set());
  readonly selectedDrafts = computed(() =>
    this.items().filter((i) => i.status === 'Draft' && this.selected().has(i.clientInvoiceId)),
  );
  readonly draftsOnPage = computed(() => this.items().filter((i) => i.status === 'Draft'));
  readonly finalizing = signal(false);

  // Overlays
  readonly dialog = signal<InvoiceDialogRequest | null>(null);
  readonly drawerId = signal<number | null>(null);
  readonly payment = signal<PaymentTarget | null>(null);
  readonly menuFor = signal<number | null>(null);
  private readonly menuPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  readonly menuTarget = computed(() => {
    const id = this.menuFor();
    const inv = id == null ? undefined : this.items().find((i) => i.clientInvoiceId === id);
    return inv ? { inv, ...this.menuPos() } : null;
  });

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    this.billing.loadAccess().pipe(takeUntilDestroyed()).subscribe();

    // (Re)load whenever the host fixes a different client / payer.
    effect(() => {
      this.clientId();
      this.payerId();
      const open = this.onlyOpen();
      untracked(() => {
        this.hasBalance.set(open);
        this.page.set(1);
        this.load();
      });
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.billing
      .invoices({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.status(),
        clientId: this.clientId() ?? this.clientFilter()?.clientId ?? null,
        payerId: this.payerId() ?? this.payerFilter(),
        billToType: this.billToType(),
        fromDate: this.fromDate() || null,
        toDate: this.toDate() || null,
        onlyOpen: this.hasBalance(),
        overdueAsOf: this.overdueOnly() ? this.today : null,
        search: this.search().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.totalAmount.set(r.totalAmount);
          this.totalBalance.set(r.totalBalance);
          this.selected.set(new Set());
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load invoices.');
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
    this.status.set('');
    this.billToType.set('');
    this.payerFilter.set(null);
    this.clientFilter.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.hasBalance.set(this.onlyOpen());
    this.overdueOnly.set(false);
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

  isOverdue(inv: InvoiceListRow): boolean {
    return inv.balance > 0 && !!inv.dueDate && inv.dueDate.slice(0, 10) < this.today && inv.status !== 'Void';
  }

  // ------------------------------------------------------------- Selection

  toggle(inv: InvoiceListRow): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (n.has(inv.clientInvoiceId)) n.delete(inv.clientInvoiceId);
      else n.add(inv.clientInvoiceId);
      return n;
    });
  }

  toggleAllDrafts(on: boolean): void {
    this.selected.set(on ? new Set(this.draftsOnPage().map((i) => i.clientInvoiceId)) : new Set());
  }

  finalizeSelected(): void {
    const ids = this.selectedDrafts().map((i) => i.clientInvoiceId);
    if (!ids.length) return;
    this.finalizing.set(true);
    this.billing.finalizeMany(ids).subscribe({
      next: (r) => {
        this.finalizing.set(false);
        let msg = `${r.invoices.length} invoice${r.invoices.length === 1 ? '' : 's'} finalized.`;
        if (r.claimsCreated) msg += ` ${r.claimsCreated} claim(s) created.`;
        this.toast.success(msg);
        if (r.warnings.length) this.toast.error(r.warnings.join(' '));
        this.load();
      },
      error: (err: Error) => {
        this.finalizing.set(false);
        this.toast.error(err.message || 'Could not finalize the invoices.');
      },
    });
  }

  // ------------------------------------------------------------- Actions

  toggleMenu(inv: InvoiceListRow, event: MouseEvent): void {
    if (this.menuFor() === inv.clientInvoiceId) {
      this.menuFor.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 260;
    const below = rect.bottom + 4 + menuHeight <= window.innerHeight;
    this.menuPos.set({
      top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
      left: Math.max(8, rect.right - menuWidth),
    });
    this.menuFor.set(inv.clientInvoiceId);
  }

  open(inv: InvoiceListRow): void {
    this.menuFor.set(null);
    this.drawerId.set(inv.clientInvoiceId);
  }

  ask(kind: InvoiceDialogKind, inv: InvoiceListRow): void {
    this.menuFor.set(null);
    if (kind === 'adjust') {
      // Load the lines so the user can pick one.
      this.busyId.set(inv.clientInvoiceId);
      this.billing.invoice(inv.clientInvoiceId).subscribe({
        next: (d) => {
          this.busyId.set(null);
          this.dialog.set({ kind, invoice: inv, lines: d.lines });
        },
        error: () => {
          this.busyId.set(null);
          this.dialog.set({ kind, invoice: inv });
        },
      });
      return;
    }
    this.dialog.set({ kind, invoice: inv });
  }

  onDialogDone(message: string): void {
    this.dialog.set(null);
    this.toast.success(message);
    this.load();
  }

  recordPayment(inv: InvoiceListRow): void {
    this.menuFor.set(null);
    this.payment.set({ invoice: inv, client: { clientId: inv.clientId, fullName: inv.clientName ?? '' } });
  }

  onPaymentSaved(r: PaymentCreated): void {
    this.payment.set(null);
    this.toast.success(
      r.isDuplicate
        ? 'This payment was already recorded.'
        : `Payment recorded: ${money(r.appliedAmount)} applied${r.unappliedAmount > 0 ? `, ${money(r.unappliedAmount)} kept as credit` : ''}.`,
    );
    this.load();
  }

  async downloadPdf(inv: InvoiceListRow): Promise<void> {
    this.menuFor.set(null);
    this.busyId.set(inv.clientInvoiceId);
    try {
      await this.pdf.open(inv);
    } catch (err) {
      this.toast.error((err as Error)?.message || 'Could not open the invoice PDF.');
    }
    this.busyId.set(null);
  }

  /** New invoices are created by invoice runs (optionally for this client only). */
  newInvoices(): void {
    const cid = this.clientId();
    const queryParams: Record<string, string> = { tab: 'runs', new: '1' };
    if (cid != null) {
      queryParams['clientId'] = String(cid);
      if (this.clientName()) queryParams['clientName'] = this.clientName()!;
    }
    this.router.navigate(['/dashboard/billing'], { queryParams });
  }

  canFinalize(i: InvoiceListRow): boolean {
    return this.writable() && i.status === 'Draft';
  }
  canSend(i: InvoiceListRow): boolean {
    return this.writable() && (i.status === 'Issued' || i.status === 'PartiallyPaid' || i.status === 'Paid');
  }
  canPay(i: InvoiceListRow): boolean {
    return this.writable() && (i.status === 'Issued' || i.status === 'PartiallyPaid') && i.balance > 0;
  }
  canAdjust(i: InvoiceListRow): boolean {
    return this.writable() && (i.status === 'Issued' || i.status === 'PartiallyPaid' || i.status === 'Paid');
  }
  canVoid(i: InvoiceListRow): boolean {
    return this.writable() && (i.status === 'Issued' || i.status === 'PartiallyPaid' || i.status === 'Paid');
  }
}
