/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { wallDate, wallRange, wallTime } from '../../../core/models/scheduler.model';
import {
  ResolveAction,
  VisitException,
  VisitExceptionStatus,
  VisitExceptionType,
  exceptionTypeLabel,
  resolutionLabel,
} from '../../../core/models/visit-exception.model';
import { ToastService } from '../../../core/services/toast.service';
import { VisitExceptionService } from '../../../core/services/visit-exception.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/** "yyyy-MM-ddTHH:mm" part of a wall-clock string. */
const datePart = (v: string) => (v ?? '').slice(0, 10);
const timePart = (v: string) => (v ?? '').slice(11, 16);

/** Missed clock-ins / clock-outs: list with Add time / No-show / Dismiss. */
@Component({
  selector: 'app-visit-exceptions',
  imports: [FormsModule, RouterLink, DatePipe, Alert, Paginator],
  templateUrl: './visit-exceptions.html',
})
export class VisitExceptions {
  private readonly service = inject(VisitExceptionService);
  private readonly toast = inject(ToastService);

  readonly items = signal<VisitException[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly status = signal<VisitExceptionStatus | 'All'>('Open');
  readonly type = signal<VisitExceptionType | ''>('');
  readonly from = signal('');
  readonly to = signal('');

  // Resolve dialog
  readonly resolving = signal<{ ex: VisitException; action: ResolveAction } | null>(null);
  readonly inDate = signal('');
  readonly inTime = signal('');
  readonly outDate = signal('');
  readonly outTime = signal('');
  readonly note = signal('');
  readonly dialogError = signal('');
  readonly busy = signal(false);

  readonly typeLabel = exceptionTypeLabel;
  readonly resolutionLabel = resolutionLabel;
  readonly wallRange = wallRange;
  readonly wallDate = wallDate;
  readonly wallTime = wallTime;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.status(),
        type: this.type(),
        // from / to filter the visit start (wall clock).
        from: this.from() ? `${this.from()}T00:00:00` : undefined,
        to: this.to() ? `${this.to()}T23:59:00` : undefined,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load missed clock-ins.');
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSize(n: number): void {
    this.pageSize.set(n);
    this.applyFilters();
  }

  statusClass(s: VisitExceptionStatus | string): string {
    switch (s) {
      case 'Open':
        return 'bg-red-50 text-red-700';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

  open(ex: VisitException, action: ResolveAction): void {
    this.dialogError.set('');
    this.note.set('');
    this.inDate.set(datePart(ex.startUtc));
    this.inTime.set(timePart(ex.startUtc));
    this.outDate.set(datePart(ex.endUtc));
    this.outTime.set(timePart(ex.endUtc));
    this.resolving.set({ ex, action });
  }

  /** A missed clock-out with an open entry only needs the clock-out time. */
  needsClockIn(ex: VisitException): boolean {
    return ex.exceptionType === 'MissedClockIn';
  }

  submit(): void {
    const r = this.resolving();
    if (!r) return;
    const note = this.note().trim() || null;
    let body: { action: ResolveAction; clockInUtc?: string | null; clockOutUtc?: string | null; note?: string | null };
    if (r.action === 'AddTime') {
      const clockOutUtc = this.outDate() && this.outTime() ? `${this.outDate()}T${this.outTime()}:00` : '';
      const clockInUtc = this.inDate() && this.inTime() ? `${this.inDate()}T${this.inTime()}:00` : '';
      if (!clockOutUtc || (this.needsClockIn(r.ex) && !clockInUtc)) {
        this.dialogError.set('Enter the clock-in and clock-out times.');
        return;
      }
      if (clockInUtc && clockOutUtc <= clockInUtc) {
        this.dialogError.set('Clock-out must be after clock-in.');
        return;
      }
      if (!note) {
        this.dialogError.set('Give a reason for the manual time.');
        return;
      }
      body = { action: 'AddTime', clockInUtc: clockInUtc || null, clockOutUtc, note };
    } else {
      body = { action: r.action, note };
    }
    this.busy.set(true);
    this.dialogError.set('');
    this.service.resolve(r.ex.exceptionId, body).subscribe({
      next: () => {
        this.busy.set(false);
        this.resolving.set(null);
        this.toast.success(
          r.action === 'AddTime' ? 'Time added.' : r.action === 'NoShow' ? 'Marked as a no-show; the visit was cancelled.' : 'Dismissed.',
        );
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.dialogError.set(err.message || 'Could not resolve.');
      },
    });
  }
}
