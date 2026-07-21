import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationStatus,
} from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { exportApplicationPdf } from '../../../shared/util/pdf.util';

type Filter = 'All' | ApplicationStatus;

@Component({
  selector: 'app-applications',
  imports: [DatePipe, FormsModule, Alert],
  templateUrl: './applications.html',
})
export class Applications {
  private readonly service = inject(ApplicationService);

  readonly filters: Filter[] = ['All', 'Pending', 'Approved', 'Rejected'];
  readonly filter = signal<Filter>('Pending');

  readonly items = signal<ApplicationListItem[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');

  readonly selected = signal<ApplicationDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly actionBusy = signal(false);
  readonly actionError = signal('');
  readonly actionNotice = signal('');
  readonly rejecting = signal(false);
  readonly rejectReason = signal('');
  readonly pdfBusy = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.listError.set('');
    const f = this.filter();
    this.service.list(f === 'All' ? undefined : f).subscribe({
      next: (items) => {
        this.items.set(items);
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
    this.load();
  }

  open(id: number): void {
    this.detailLoading.set(true);
    this.actionError.set('');
    this.actionNotice.set('');
    this.rejecting.set(false);
    this.rejectReason.set('');
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

  approve(): void {
    const app = this.selected();
    if (!app) return;
    this.actionBusy.set(true);
    this.actionError.set('');
    this.service.approve(app.applicationId).subscribe({
      next: (msg) => {
        this.actionBusy.set(false);
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
    // Update the open detail + the row in place, then reload the list.
    const current = this.selected();
    if (current && current.applicationId === id) {
      this.selected.set({ ...current, status: newStatus });
    }
    this.load();
  }
}
