/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  TRAINING_STATUS_BADGE,
  TRAINING_STATUS_LABELS,
  TrainingHistory,
  TrainingStatus,
} from '../../../core/models/training.model';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/** Training status report: every status change of the people the viewer oversees. */
@Component({
  selector: 'app-training-reports',
  imports: [FormsModule, DatePipe, RouterLink, Alert, Paginator],
  templateUrl: './training-reports.html',
})
export class TrainingReports {
  private readonly training = inject(TrainingService);

  readonly labels = TRAINING_STATUS_LABELS;
  readonly badge = TRAINING_STATUS_BADGE;
  readonly statuses: TrainingStatus[] = ['Assigned', 'InProgress', 'Submitted', 'Approved', 'Rejected', 'Cancelled'];

  readonly rows = signal<TrainingHistory[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly from = signal(this.daysAgo(30));
  readonly to = signal(new Date().toISOString().slice(0, 10));
  readonly status = signal('');
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  private filters(page: number, pageSize: number) {
    return { from: this.from() || null, to: this.to() || null, status: this.status() || null, page, pageSize };
  }

  load(): void {
    this.loading.set(true);
    this.training.report(this.filters(this.page(), this.pageSize())).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  /** Downloads the whole filtered report (up to 500 rows) as CSV. */
  exportCsv(): void {
    this.exporting.set(true);
    this.training.report(this.filters(1, 500)).subscribe({
      next: (r) => {
        const head = ['Date (UTC)', 'Person', 'Role', 'Training', 'From', 'To', 'Progress %', 'Score %', 'Changed by', 'Comment', 'Due date'];
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = r.items.map((h) =>
          [h.changedOn, h.userName, h.userRoleName === 'User' ? 'Caregiver' : h.userRoleName, h.trainingTitle,
            h.fromStatus ? this.labels[h.fromStatus] : '', this.labels[h.toStatus], h.progressPercent, h.score,
            h.changedByName, h.comment, h.dueDate?.slice(0, 10)].map(esc).join(','),
        );
        const blob = new Blob([[head.map(esc).join(','), ...lines].join('\r\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `training-report-${this.from()}-to-${this.to()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.exporting.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.exporting.set(false);
      },
    });
  }
}
