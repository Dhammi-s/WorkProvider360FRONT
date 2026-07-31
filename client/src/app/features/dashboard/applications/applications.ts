/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationStatus,
} from '../../../core/models/application.model';
import { Office } from '../../../core/models/office.model';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { OfficeService } from '../../../core/services/office.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';
import { exportApplicationPdf } from '../../../shared/util/pdf.util';

type Filter = 'All' | ApplicationStatus;

@Component({
  selector: 'app-applications',
  imports: [DatePipe, CurrencyPipe, FormsModule, Alert, Paginator],
  templateUrl: './applications.html',
})
export class Applications {
  private readonly service = inject(ApplicationService);
  private readonly officeService = inject(OfficeService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  readonly filters: Filter[] = ['All', 'Pending', 'Approved', 'Rejected'];
  readonly filter = signal<Filter>('Pending');

  readonly items = signal<ApplicationListItem[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');

  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(1);
    this.load();
  }

  readonly offices = signal<Office[]>([]);

  readonly selected = signal<ApplicationDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly actionBusy = signal(false);
  readonly actionError = signal('');
  readonly actionNotice = signal('');
  readonly rejecting = signal(false);
  readonly rejectReason = signal('');
  readonly approving = signal(false);
  readonly approveOfficeId = signal('');
  readonly pdfBusy = signal(false);

  constructor() {
    this.load();
    // SuperAdmin assigns an office when approving; Admins use their own office.
    if (this.isSuperAdmin()) {
      this.officeService.list().subscribe({
        next: (o) => this.offices.set(o.filter((x) => x.isActive)),
        error: () => this.offices.set([]),
      });
    }
  }

  load(): void {
    this.loading.set(true);
    this.listError.set('');
    const f = this.filter();
    this.service.listPaged(f === 'All' ? undefined : f, this.page(), this.pageSize()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.listError.set(err.message || 'Could not load applications.');
        this.loading.set(false);
      },
    });
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
    this.page.set(1);
    this.load();
  }

  open(id: number): void {
    this.detailLoading.set(true);
    this.actionError.set('');
    this.actionNotice.set('');
    this.rejecting.set(false);
    this.rejectReason.set('');
    this.approving.set(false);
    this.approveOfficeId.set('');
    this.selected.set(null);
    this.service.detail(id).subscribe({
      next: (d) => {
        this.selected.set(d);
        this.detailLoading.set(false);
      },
      error: (err: Error) => {
        this.actionError.set(err.message || 'Could not load the application.');
        this.detailLoading.set(false);
      },
    });
  }

  close(): void {
    this.selected.set(null);
  }

  /** SuperAdmin picks an office first; Admin approves straight away (own office). */
  startApprove(): void {
    this.actionError.set('');
    if (this.isSuperAdmin()) {
      this.approving.set(true);
    } else {
      this.confirmApprove();
    }
  }

  confirmApprove(): void {
    const app = this.selected();
    if (!app) return;
    if (this.isSuperAdmin() && !this.approveOfficeId()) {
      this.actionError.set('Please choose an office for the new user.');
      return;
    }
    this.actionBusy.set(true);
    this.actionError.set('');
    this.service
      .approve(app.applicationId, this.isSuperAdmin() ? this.approveOfficeId() : null)
      .subscribe({
        next: (msg) => {
          this.actionBusy.set(false);
          this.approving.set(false);
          this.actionNotice.set(msg);
          this.refreshAfterAction(app.applicationId, 'Approved');
        },
        error: (err: Error) => {
          this.actionError.set(err.message || 'Could not approve.');
          this.actionBusy.set(false);
        },
      });
  }

  confirmReject(): void {
    const app = this.selected();
    if (!app) return;
    if (!this.rejectReason().trim()) {
      this.actionError.set('Please provide a reason.');
      return;
    }
    this.actionBusy.set(true);
    this.actionError.set('');
    this.service.reject(app.applicationId, this.rejectReason().trim()).subscribe({
      next: (msg) => {
        this.actionBusy.set(false);
        this.actionNotice.set(msg);
        this.refreshAfterAction(app.applicationId, 'Rejected');
      },
      error: (err: Error) => {
        this.actionError.set(err.message || 'Could not reject.');
        this.actionBusy.set(false);
      },
    });
  }

  async downloadPdf(app: ApplicationDetail): Promise<void> {
    this.pdfBusy.set(true);
    try {
      await exportApplicationPdf(app);
    } finally {
      this.pdfBusy.set(false);
    }
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700';
      case 'Rejected':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  }

  private refreshAfterAction(id: number, newStatus: ApplicationStatus): void {
    this.rejecting.set(false);
    this.approving.set(false);
    this.approveOfficeId.set('');
    // Update the open detail + the row in place, then reload the list.
    const current = this.selected();
    if (current && current.applicationId === id) {
      this.selected.set({ ...current, status: newStatus });
    }
    this.load();
  }
}
