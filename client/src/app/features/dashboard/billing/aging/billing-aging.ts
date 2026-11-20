/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Aging,
  AgingGroup,
  AgingGroupBy,
  BillToType,
  InvoiceListRow,
  fmtDate,
  invoiceNumberLabel,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  periodLabel,
  todayYmd,
} from '../../../../core/models/billing.model';
import { BillingService } from '../../../../core/services/billing.service';
import { PaymentsService } from '../../../../core/services/payments.service';
import { ClientInvoices } from '../../../../shared/ui/client-invoices/client-invoices';
import { Paginator } from '../../../../shared/ui/paginator/paginator';

/** Billing ▸ Aging: open AR by days past due, grouped by payer / client / bill-to type, with drill-down. */
@Component({
  selector: 'app-billing-aging',
  imports: [FormsModule, ClientInvoices, Paginator],
  templateUrl: './billing-aging.html',
})
export class BillingAging {
  private readonly billing = inject(BillingService);
  private readonly payments = inject(PaymentsService);

  readonly canManage = this.billing.canManage;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;
  readonly numberLabel = invoiceNumberLabel;

  readonly asOf = signal(todayYmd());
  readonly groupBy = signal<AgingGroupBy>('Payer');
  readonly aging = signal<Aging | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly search = signal('');

  readonly buckets: { key: keyof Pick<AgingGroup, 'current' | 'days1To30' | 'days31To60' | 'days61To90' | 'days90Plus'>; label: string }[] = [
    { key: 'current', label: 'Current' },
    { key: 'days1To30', label: '1–30' },
    { key: 'days31To60', label: '31–60' },
    { key: 'days61To90', label: '61–90' },
    { key: 'days90Plus', label: '90+' },
  ];

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.aging()?.groups ?? [];
    return q ? list.filter((g) => (g.groupName ?? '').toLowerCase().includes(q)) : list;
  });

  // Drill-down
  readonly drill = signal<{ group: AgingGroup; groupBy: AgingGroupBy } | null>(null);
  readonly drillRows = signal<InvoiceListRow[]>([]);
  readonly drillTotal = signal(0);
  readonly drillPage = signal(1);
  readonly drillLoading = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.asOf()) return;
    this.loading.set(true);
    this.error.set('');
    this.payments.aging(this.asOf(), this.groupBy()).subscribe({
      next: (a) => {
        this.aging.set(a);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message || 'Could not load the aging report.');
      },
    });
  }

  setGroupBy(g: AgingGroupBy): void {
    this.groupBy.set(g);
    this.drill.set(null);
    this.load();
  }

  bucketClass(key: string, value: number): string {
    if (!value) return 'text-slate-300';
    switch (key) {
      case 'days61To90':
        return 'text-orange-700';
      case 'days90Plus':
        return 'font-semibold text-red-700';
      case 'days31To60':
        return 'text-amber-700';
      default:
        return 'text-slate-700';
    }
  }

  share(value: number): number {
    const t = this.aging()?.totals.total ?? 0;
    return t > 0 ? Math.round((value / t) * 100) : 0;
  }

  open(g: AgingGroup): void {
    this.drill.set({ group: g, groupBy: this.groupBy() });
    if (this.groupBy() === 'BillToType') {
      this.drillPage.set(1);
      this.loadDrill();
    }
  }

  /** Payer / client id of the drilled group (null when the group has none, e.g. "no payer"). */
  drillPayerId(): number | null {
    const d = this.drill();
    return d && d.groupBy === 'Payer' ? d.group.groupId : null;
  }

  drillClientId(): number | null {
    const d = this.drill();
    return d && d.groupBy === 'Client' ? d.group.groupId : null;
  }

  loadDrill(): void {
    const d = this.drill();
    if (!d) return;
    const key = (d.group.groupKey || d.group.groupName || '').toLowerCase();
    const billToType: BillToType = key.includes('client') || key.includes('private') ? 'Client' : 'Payer';
    this.drillLoading.set(true);
    this.billing.invoices({ billToType, onlyOpen: true, page: this.drillPage(), pageSize: 20 }).subscribe({
      next: (r) => {
        this.drillRows.set(r.items);
        this.drillTotal.set(r.total);
        this.drillLoading.set(false);
      },
      error: () => {
        this.drillRows.set([]);
        this.drillLoading.set(false);
      },
    });
  }

  onDrillPage(p: number): void {
    this.drillPage.set(p);
    this.loadDrill();
  }
}
