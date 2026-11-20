/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  FinalizeResult,
  InvoiceRun,
  InvoiceRunDetail,
  InvoiceRunDiscard,
  InvoiceRunStatus,
  cents,
  fmtDate,
  invoiceNumberLabel,
  invoiceStatusClass,
  invoiceStatusLabel,
  money,
  periodLabel,
} from '../../../../core/models/billing.model';
import { BillingService } from '../../../../core/services/billing.service';
import { PickedClient } from '../../../../shared/ui/billing/billing-pickers';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Paginator } from '../../../../shared/ui/paginator/paginator';
import { RunWizard } from './run-wizard/run-wizard';

/** Billing ▸ Invoice runs: runs list, run detail (finalize / discard) and the new-run wizard. */
@Component({
  selector: 'app-billing-invoice-runs',
  imports: [FormsModule, Paginator, ConfirmDialog, RunWizard],
  templateUrl: './invoice-runs.html',
})
export class BillingInvoiceRuns {
  private readonly billing = inject(BillingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = this.billing.canManage;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statusLabel = invoiceStatusLabel;
  readonly numberLabel = invoiceNumberLabel;

  readonly items = signal<InvoiceRun[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly statusFilter = signal<InvoiceRunStatus | ''>('');
  readonly loading = signal(true);
  readonly error = signal('');

  // Wizard
  readonly wizardOpen = signal(false);
  readonly wizardClient = signal<PickedClient | null>(null);
  readonly resumeRunId = signal<number | null>(null);

  // Detail drawer
  readonly detail = signal<InvoiceRunDetail | null>(null);
  readonly detailOpen = signal(false);
  readonly detailLoading = signal(false);
  readonly selected = signal<Set<number>>(new Set());
  readonly busy = signal(false);
  readonly detailError = signal('');
  readonly detailErrors = signal<string[]>([]);
  readonly finalizeResult = signal<FinalizeResult | null>(null);
  readonly confirmFinalize = signal<'all' | 'selected' | null>(null);
  readonly confirmDiscard = signal<InvoiceRun | null>(null);
  readonly discardResult = signal<InvoiceRunDiscard | null>(null);

  readonly draftRows = computed(() => (this.detail()?.invoices ?? []).filter((i) => i.status === 'Draft'));

  readonly sumAmount = (s: number, i: { amount: number }) => cents(s + i.amount);

  constructor() {
    this.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      if (q.get('tab') === 'runs' && q.get('new') === '1') {
        const id = Number(q.get('clientId'));
        this.wizardClient.set(
          Number.isInteger(id) && id > 0 ? { clientId: id, fullName: q.get('clientName') || `Client ${id}` } : null,
        );
        this.resumeRunId.set(null);
        if (this.canManage()) this.wizardOpen.set(true);
        // Drop the one-shot params so a refresh does not reopen the wizard.
        this.router.navigate([], { relativeTo: this.route, queryParams: { tab: 'runs' }, replaceUrl: true });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.billing
      .runs(this.page(), this.pageSize(), this.statusFilter() || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load invoice runs.');
          this.loading.set(false);
        },
      });
  }

  onStatus(s: InvoiceRunStatus | ''): void {
    this.statusFilter.set(s);
    this.page.set(1);
    this.load();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(1);
    this.load();
  }

  scopeLabel(r: InvoiceRun): string {
    const parts: string[] = [];
    if (r.officeName) parts.push(r.officeName);
    if (r.clientName) parts.push(r.clientName);
    if (r.payerName) parts.push(r.payerName);
    if (r.payerType) parts.push(r.payerType);
    if (r.billToType) parts.push(r.billToType === 'Client' ? 'Private pay' : 'Payers');
    return parts.length ? parts.join(' · ') : 'Everything';
  }

  runStatusClass(s: string): string {
    switch (s) {
      case 'Finalized':
        return 'bg-emerald-50 text-emerald-700';
      case 'Discarded':
        return 'bg-slate-100 text-slate-500 line-through';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  // ------------------------------------------------------------ Wizard

  newRun(): void {
    this.wizardClient.set(null);
    this.resumeRunId.set(null);
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
    this.resumeRunId.set(null);
    this.load();
  }

  resume(runId: number): void {
    this.closeDetail();
    this.wizardClient.set(null);
    this.resumeRunId.set(runId);
    this.wizardOpen.set(true);
  }

  // ------------------------------------------------------------ Detail

  openDetail(r: InvoiceRun): void {
    this.detail.set(null);
    this.finalizeResult.set(null);
    this.discardResult.set(null);
    this.detailError.set('');
    this.detailErrors.set([]);
    this.detailOpen.set(true);
    this.loadDetail(r.runId);
  }

  private loadDetail(runId: number): void {
    this.detailLoading.set(true);
    this.billing.run(runId).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
        this.selected.set(new Set(d.invoices.filter((i) => i.status === 'Draft').map((i) => i.clientInvoiceId)));
      },
      error: (err: Error) => {
        this.detailLoading.set(false);
        this.detailError.set(err.message || 'Could not load the run.');
      },
    });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.detail.set(null);
    this.detailError.set('');
    this.finalizeResult.set(null);
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  toggle(id: number): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  selectAll(on: boolean): void {
    this.selected.set(on ? new Set(this.draftRows().map((i) => i.clientInvoiceId)) : new Set());
  }

  doFinalize(): void {
    const mode = this.confirmFinalize();
    const d = this.detail();
    this.confirmFinalize.set(null);
    if (!mode || !d) return;
    this.busy.set(true);
    this.detailError.set('');
    this.detailErrors.set([]);
    const req$ = mode === 'all' ? this.billing.finalizeRun(d.run.runId) : this.billing.finalizeMany([...this.selected()]);
    req$.subscribe({
      next: (res) => {
        this.busy.set(false);
        this.finalizeResult.set(res);
        this.loadDetail(d.run.runId);
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const e = apiErrorLines(err, 'Could not finalize the invoices.');
        this.detailError.set(e.message);
        this.detailErrors.set(e.errors);
      },
    });
  }

  doDiscard(): void {
    const r = this.confirmDiscard();
    this.confirmDiscard.set(null);
    if (!r) return;
    this.busy.set(true);
    this.billing.discardRun(r.runId).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.discardResult.set(res);
        if (this.detailOpen() && this.detail()?.run.runId === r.runId) this.loadDetail(r.runId);
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not discard the run.');
      },
    });
  }
}
