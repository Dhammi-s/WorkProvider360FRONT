/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import {
  InvoiceListRow,
  fmtDate,
  money,
  periodLabel,
} from '../../../../core/models/billing.model';
import {
  CLAIM_STATUSES,
  ClaimBatchResult,
  ClaimCreateResult,
  ClaimListRow,
  ClaimStatus,
  ClaimValidationResult,
  Submission,
  SubmissionDetail,
  claimFrequencyLabel,
  claimStatusClass,
  claimStatusLabel,
  groupValidationErrors,
  parseValidationErrors,
  submissionStatusClass,
} from '../../../../core/models/claims.model';
import { saveFileResponse } from '../../../../core/services/billing-http';
import { BillingService } from '../../../../core/services/billing.service';
import { ClaimsService } from '../../../../core/services/claims.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ClientPicker, PayerSelect, PickedClient } from '../../../../shared/ui/billing/billing-pickers';
import { Paginator } from '../../../../shared/ui/paginator/paginator';
import { ClaimDrawer } from './claim-drawer';

type View = 'claims' | 'batches';

/**
 * Billing ▸ Claims: 837P claims (filters, work queue, create from invoices, validate,
 * generate batch, detail drawer) and claim batches (download / SFTP upload, detail).
 */
@Component({
  selector: 'app-billing-claims',
  imports: [FormsModule, ClientPicker, PayerSelect, Paginator, ClaimDrawer],
  templateUrl: './billing-claims.html',
})
export class BillingClaims {
  private readonly claims = inject(ClaimsService);
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = this.billing.canManage;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly periodLabel = periodLabel;
  readonly statuses = CLAIM_STATUSES;
  readonly statusClass = claimStatusClass;
  readonly statusLabel = claimStatusLabel;
  readonly freqLabel = claimFrequencyLabel;
  readonly subClass = submissionStatusClass;
  readonly parseErrors = parseValidationErrors;

  readonly view = signal<View>('claims');

  // ------------------------------------------------------------------ Claims list
  readonly items = signal<ClaimListRow[]>([]);
  readonly total = signal(0);
  readonly totalCharge = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly status = signal<ClaimStatus | ''>('');
  readonly workQueue = signal(false);
  readonly payerId = signal<number | null>(null);
  readonly client = signal<PickedClient | null>(null);
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly search = signal('');
  private readonly search$ = new Subject<void>();

  readonly selected = signal<Set<number>>(new Set());
  readonly selectedRows = computed(() => this.items().filter((c) => this.selected().has(c.claimId)));
  readonly selectedReady = computed(() => this.selectedRows().filter((c) => c.status === 'Ready'));
  readonly selectedValidatable = computed(() =>
    this.selectedRows().filter((c) => c.status === 'Draft' || c.status === 'Ready' || c.status === 'Rejected'),
  );
  readonly allSelected = computed(() => this.items().length > 0 && this.items().every((c) => this.selected().has(c.claimId)));

  readonly busy = signal(false);
  readonly drawerId = signal<number | null>(null);

  /** Validation results popup. */
  readonly validation = signal<ClaimValidationResult[] | null>(null);
  /** Batch result popup. */
  readonly batchResult = signal<ClaimBatchResult | null>(null);
  readonly batchError = signal<{ message: string; errors: string[] } | null>(null);

  // Create from invoices
  readonly createOpen = signal(false);
  readonly invLoading = signal(false);
  readonly invoiceRows = signal<InvoiceListRow[]>([]);
  readonly invSelected = signal<Set<number>>(new Set());
  readonly invSearch = signal('');
  readonly createResult = signal<ClaimCreateResult | null>(null);
  readonly createError = signal('');

  // ------------------------------------------------------------------ Batches
  readonly batches = signal<Submission[]>([]);
  readonly batchTotal = signal(0);
  readonly batchPage = signal(1);
  readonly batchPageSize = signal(20);
  readonly batchStatus = signal('');
  readonly batchLoading = signal(false);
  readonly batchDetail = signal<SubmissionDetail | null>(null);
  readonly batchBusyId = signal<number | null>(null);

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    this.load();
  }

  setView(v: View): void {
    this.view.set(v);
    if (v === 'batches') this.loadBatches();
    else this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.claims
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.workQueue() ? '' : this.status(),
        workQueue: this.workQueue(),
        payerId: this.payerId(),
        clientId: this.client()?.clientId ?? null,
        fromDate: this.fromDate() || null,
        toDate: this.toDate() || null,
        search: this.search().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.totalCharge.set(r.totalAmount ?? 0);
          this.loading.set(false);
          const ids = new Set(r.items.map((c) => c.claimId));
          this.selected.update((s) => new Set([...s].filter((id) => ids.has(id))));
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.error.set(err.message || 'Could not load claims.');
        },
      });
  }

  onSearch(q: string): void {
    this.search.set(q);
    this.search$.next();
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.status.set('');
    this.workQueue.set(false);
    this.payerId.set(null);
    this.client.set(null);
    this.fromDate.set('');
    this.toDate.set('');
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

  toggle(id: number): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  toggleAll(): void {
    if (this.allSelected()) this.selected.set(new Set());
    else this.selected.set(new Set(this.items().map((c) => c.claimId)));
  }

  errorCount(c: ClaimListRow): number {
    return parseValidationErrors(c.validationErrors).length;
  }

  // ------------------------------------------------------------------ Validate / batch

  validateSelected(): void {
    const ids = this.selectedValidatable().map((c) => c.claimId);
    if (!ids.length) return;
    this.busy.set(true);
    this.claims.validate(ids).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.validation.set(r);
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not validate the claims.');
      },
    });
  }

  grouped(errors: string[]) {
    return groupValidationErrors(errors);
  }

  validCount(results: ClaimValidationResult[]): number {
    return results.filter((r) => r.errors.length === 0).length;
  }

  generateBatch(): void {
    const ids = this.selectedReady().map((c) => c.claimId);
    if (!ids.length) return;
    this.busy.set(true);
    this.batchError.set(null);
    this.claims.generateBatch(ids).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.batchResult.set(r);
        this.selected.set(new Set());
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        // 409 with the messages when a claim is no longer valid (it goes back to Draft).
        this.batchError.set(apiErrorLines(err, 'Could not generate the batch.'));
        this.load();
      },
    });
  }

  downloadBatch(submissionId: number, fileName?: string | null): void {
    this.batchBusyId.set(submissionId);
    this.claims.batchFile(submissionId).subscribe({
      next: (res) => {
        this.batchBusyId.set(null);
        saveFileResponse(res, fileName || `claims-${submissionId}.837`);
        if (this.view() === 'batches') this.loadBatches();
      },
      error: (err: Error) => {
        this.batchBusyId.set(null);
        this.toast.error(err.message || 'Could not download the file.');
      },
    });
  }

  uploadBatch(b: Submission): void {
    this.batchBusyId.set(b.submissionId);
    this.claims.uploadBatch(b.submissionId).subscribe({
      next: (r) => {
        this.batchBusyId.set(null);
        this.toast.success(`Batch ${b.interchangeControlNumber}: ${r.status} (attempt ${r.uploadAttempts}).`);
        this.loadBatches();
      },
      error: (err: Error) => {
        this.batchBusyId.set(null);
        this.toast.error(err.message || 'The SFTP upload failed.');
        this.loadBatches();
      },
    });
  }

  // ------------------------------------------------------------------ Create from invoices

  openCreate(): void {
    this.createOpen.set(true);
    this.createResult.set(null);
    this.createError.set('');
    this.invSelected.set(new Set());
    this.invSearch.set('');
    this.loadClaimableInvoices();
  }

  loadClaimableInvoices(): void {
    this.invLoading.set(true);
    const q = { pageSize: 200, billToType: 'Payer' as const, search: this.invSearch().trim() || null };
    forkJoin([
      this.billing.invoices({ ...q, status: 'Issued' }),
      this.billing.invoices({ ...q, status: 'PartiallyPaid' }),
    ]).subscribe({
      next: ([a, b]) => {
        this.invLoading.set(false);
        this.invoiceRows.set(
          [...a.items, ...b.items]
            .filter((i) => i.claimFormat === 'Claim837P')
            .sort((x, y) => (x.invoiceNumber ?? '').localeCompare(y.invoiceNumber ?? '')),
        );
      },
      error: (err: Error) => {
        this.invLoading.set(false);
        this.createError.set(err.message || 'Could not load the invoices.');
      },
    });
  }

  toggleInvoice(id: number): void {
    this.invSelected.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  createClaims(): void {
    const ids = [...this.invSelected()];
    if (!ids.length) return;
    this.busy.set(true);
    this.createError.set('');
    this.claims.createFromInvoices(ids).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.createResult.set(r);
        this.load();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const e = apiErrorLines(err, 'Could not create the claims.');
        this.createError.set([e.message, ...e.errors].filter(Boolean).join(' '));
      },
    });
  }

  // ------------------------------------------------------------------ Batches

  loadBatches(): void {
    this.batchLoading.set(true);
    this.claims.batches(this.batchPage(), this.batchPageSize(), this.batchStatus() || null).subscribe({
      next: (r) => {
        this.batches.set(r.items);
        this.batchTotal.set(r.total);
        this.batchLoading.set(false);
      },
      error: (err: Error) => {
        this.batchLoading.set(false);
        this.error.set(err.message || 'Could not load the batches.');
      },
    });
  }

  onBatchPage(p: number): void {
    this.batchPage.set(p);
    this.loadBatches();
  }

  onBatchPageSize(n: number): void {
    this.batchPageSize.set(n);
    this.batchPage.set(1);
    this.loadBatches();
  }

  openBatch(b: Submission): void {
    this.claims.batch(b.submissionId).subscribe({
      next: (d) => this.batchDetail.set(d),
      error: (err: Error) => this.toast.error(err.message || 'Could not load the batch.'),
    });
  }
}
