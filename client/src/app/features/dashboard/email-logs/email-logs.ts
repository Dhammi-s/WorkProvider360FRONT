import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { EmailLog, LogAccess } from '../../../core/models/log.model';
import { LogService } from '../../../core/services/log.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Global email logs. View access is controlled by SuperAdmin in Settings → Log Access. */
@Component({
  selector: 'app-email-logs',
  imports: [DatePipe, Alert],
  templateUrl: './email-logs.html',
})
export class EmailLogs {
  private readonly service = inject(LogService);

  readonly access = signal<LogAccess | null>(null);
  readonly loading = signal(true);
  readonly listError = signal('');

  readonly logs = signal<EmailLog[]>([]);
  readonly selected = signal<EmailLog | null>(null);

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
    this.service.emails(200).subscribe({
      next: (logs) => {
        this.logs.set(logs);
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
