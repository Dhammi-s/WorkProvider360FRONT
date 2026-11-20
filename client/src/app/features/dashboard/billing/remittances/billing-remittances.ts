/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { apiErrorLines } from '../../../../core/models/api-response.model';
import { fmtDate, money } from '../../../../core/models/billing.model';
import {
  EdiImportResult,
  REMITTANCE_STATUSES,
  RemittanceListRow,
  RemittanceStatus,
  remittanceStatusClass,
} from '../../../../core/models/claims.model';
import { BillingService } from '../../../../core/services/billing.service';
import { ClaimsService } from '../../../../core/services/claims.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PayerSelect } from '../../../../shared/ui/billing/billing-pickers';
import { Paginator } from '../../../../shared/ui/paginator/paginator';
import { RemittanceDetailPanel } from './remittance-detail';

/**
 * Billing ▸ Remittances: upload 999 / 277CA / 835 files (or poll SFTP), list the
 * 835 remittances, the unmatched work queue, and the detail with matching and posting.
 */
@Component({
  selector: 'app-billing-remittances',
  imports: [FormsModule, PayerSelect, Paginator, RemittanceDetailPanel],
  templateUrl: './billing-remittances.html',
})
export class BillingRemittances {
  private readonly claims = inject(ClaimsService);
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = this.billing.canManage;
  readonly money = money;
  readonly fmtDate = fmtDate;
  readonly statuses = REMITTANCE_STATUSES;
  readonly statusClass = remittanceStatusClass;

  readonly items = signal<RemittanceListRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly unmatchedQueue = signal(false);
  readonly status = signal<RemittanceStatus | ''>('');
  readonly payerId = signal<number | null>(null);
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly search = signal('');
  private readonly search$ = new Subject<void>();

  readonly uploading = signal(false);
  readonly polling = signal(false);
  readonly imports = signal<EdiImportResult[]>([]);

  readonly detailId = signal<number | null>(null);

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.claims
      .remittances({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.unmatchedQueue() ? 'Unmatched' : this.status(),
        payerId: this.payerId(),
        fromDate: this.fromDate() || null,
        toDate: this.toDate() || null,
        search: this.search().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.error.set(err.message || 'Could not load remittances.');
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

  setQueue(on: boolean): void {
    this.unmatchedQueue.set(on);
    this.applyFilters();
  }

  resetFilters(): void {
    this.status.set('');
    this.payerId.set(null);
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

  onFile(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      this.toast.error('The file is larger than 20 MB.');
      return;
    }
    this.uploading.set(true);
    this.claims.upload(file).subscribe({
      next: (r) => {
        this.uploading.set(false);
        this.imports.update((list) => [r, ...list].slice(0, 5));
        if (r.isDuplicate) this.toast.show(`${r.fileName} was already imported.`, 'info');
        else if (r.status === 'Failed') this.toast.error(`${r.fileName}: import failed.`);
        else this.toast.success(`${r.fileName} (${r.fileType}) imported.`);
        this.load();
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        const e = apiErrorLines(err, 'Could not import the file.');
        this.toast.error([e.message, ...e.errors].filter(Boolean).join(' '));
      },
    });
  }

  poll(): void {
    this.polling.set(true);
    this.claims.poll().subscribe({
      next: (r) => {
        this.polling.set(false);
        this.imports.update((list) => [...r.files, ...list].slice(0, 8));
        this.toast.success(r.fileCount ? `${r.fileCount} file${r.fileCount === 1 ? '' : 's'} received.` : 'No new files on the SFTP server.');
        this.load();
      },
      error: (err: Error) => {
        this.polling.set(false);
        this.toast.error(err.message || 'Could not poll the clearinghouse.');
      },
    });
  }

  importClass(r: EdiImportResult): string {
    if (r.status === 'Failed') return 'border-red-200 bg-red-50 text-red-700';
    if (r.isDuplicate) return 'border-slate-200 bg-slate-50 text-slate-600';
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
}
