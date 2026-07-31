/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { EmailLog, LogAccess } from '../../../core/models/log.model';
import { LogService } from '../../../core/services/log.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/** Global email logs. View access is controlled by SuperAdmin in Settings → Log Access. */
@Component({
  selector: 'app-email-logs',
  imports: [DatePipe, Alert, Paginator],
  templateUrl: './email-logs.html',
})
export class EmailLogs {
  private readonly service = inject(LogService);

  readonly access = signal<LogAccess | null>(null);
  readonly loading = signal(true);
  readonly listError = signal('');

  readonly logs = signal<EmailLog[]>([]);
  readonly total = signal(0);
  readonly selected = signal<EmailLog | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(10);

  goPage(p: number): void {
    this.page.set(p);
    this.loadLogs();
  }

  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.page.set(1);
    this.loadLogs();
  }

  constructor() {
    this.service.access().subscribe({
      next: (a) => {
        this.access.set(a);
        if (a.canView) this.loadLogs();
        else this.loading.set(false);
      },
      error: (err: Error) => {
        this.listError.set(err.message || 'Could not load logs.');
        this.loading.set(false);
      },
    });
  }

  loadLogs(): void {
    this.loading.set(true);
    this.listError.set('');
    this.service.emailsPaged(this.page(), this.pageSize()).subscribe({
      next: (res) => {
        this.logs.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.listError.set(err.message || 'Could not load logs.');
        this.loading.set(false);
      },
    });
  }

  open(log: EmailLog): void {
    this.selected.set(log);
  }

  close(): void {
    this.selected.set(null);
  }

  statusBadge(status: string): string {
    return status === 'Sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
  }
}
