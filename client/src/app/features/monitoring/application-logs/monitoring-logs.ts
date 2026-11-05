/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LogRow } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringLogsService } from '../services/monitoring-logs.service';
import { FilterState } from '../shared/filter-state';
import { fmtDateTime } from '../shared/format';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonPager } from '../shared/mon-pager';
import { MonState } from '../shared/mon-state';

/** Searchable application event log. */
@Component({
  selector: 'app-monitoring-logs',
  imports: [FormsModule, MonFilterBar, MonPageHeader, MonPager, MonState],
  template: `
    <mon-page-header title="Application Logs" subtitle="Events emitted by the platform, correlated by request" />
    <mon-filter-bar [state]="filters" />

    <div class="mt-4 flex flex-wrap gap-3">
      <select class="mon-field" [(ngModel)]="eventType" (ngModelChange)="apply()">
        <option value="">All event types</option>
        @for (t of eventTypes(); track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <input class="mon-field w-64" placeholder="Search description…" [(ngModel)]="search" (keyup.enter)="apply()" />
      <input class="mon-field w-72 font-mono text-xs" placeholder="Correlation ID" [(ngModel)]="correlationId" (keyup.enter)="apply()" />
      <button type="button" class="mon-btn-primary" (click)="apply()">Search</button>
    </div>

    <div class="mt-4">
      <mon-state [loading]="loading()" [error]="error()" [empty]="rows().length === 0" (retry)="load()">
        <div class="mon-card overflow-x-auto">
          <table class="mon-table">
            <thead>
              <tr><th class="mon-th">Time</th><th class="mon-th">Tenant</th><th class="mon-th">Event type</th><th class="mon-th">Application</th><th class="mon-th">Description</th><th class="mon-th">Correlation ID</th></tr>
            </thead>
            <tbody>
              @for (r of rows(); track $index) {
                <tr class="mon-row">
                  <td class="mon-td whitespace-nowrap text-xs">{{ dt(r.eventTime) }}</td>
                  <td class="mon-td">{{ r.tenantId ?? '–' }}</td>
                  <td class="mon-td"><span class="mon-badge bg-brand-50 text-brand-700">{{ r.eventType }}</span></td>
                  <td class="mon-td text-xs">{{ r.applicationName || '–' }}</td>
                  <td class="mon-td max-w-lg break-words">{{ r.description || '–' }}</td>
                  <td class="mon-td">
                    @if (r.correlationId) {
                      <button type="button" class="font-mono text-xs text-brand-600 hover:underline" (click)="byCorrelation(r.correlationId)" title="Show all events for this request">{{ r.correlationId }}</button>
                    } @else { – }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
        </div>
      </mon-state>
    </div>
  `,
})
export class MonitoringLogs {
  private readonly api = inject(MonitoringLogsService);

  readonly filters = new FilterState({ range: '24h' });
  readonly pageSize = 50;
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly rows = signal<LogRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly eventTypes = signal<string[]>([]);

  eventType = '';
  search = '';
  correlationId = '';
  readonly dt = fmtDateTime;

  constructor() {
    this.api.eventTypes().subscribe({ next: (t) => this.eventTypes.set(t), error: () => {} });
    effect(() => {
      this.filters.version();
      untracked(() => this.apply());
    });
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  byCorrelation(id: string): void {
    this.correlationId = id;
    this.apply();
  }

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        ...this.filters.params(),
        eventType: this.eventType,
        search: this.search.trim(),
        correlationId: this.correlationId.trim(),
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (r) => {
          this.rows.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (e: MonitoringApiError) => {
          this.error.set(e);
          this.loading.set(false);
        },
      });
  }
}
