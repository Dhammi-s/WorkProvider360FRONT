/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiRequestRow, EndpointStat } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringApiPerformanceService } from '../services/monitoring-api-performance.service';
import { FilterState } from '../shared/filter-state';
import { fmtDateTime, fmtMs, fmtNum, methodClass, statusClass } from '../shared/format';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonPager } from '../shared/mon-pager';
import { MonState } from '../shared/mon-state';

type Tab = 'endpoints' | 'requests';
type SortKey = 'requests' | 'avgMs' | 'p95Ms' | 'p99Ms' | 'errors';

/** Per-endpoint latency statistics and a drill-down into individual requests. */
@Component({
  selector: 'app-monitoring-api-performance',
  imports: [FormsModule, MonFilterBar, MonPageHeader, MonPager, MonState],
  template: `
    <mon-page-header title="API Performance" subtitle="Latency percentiles, error counts and raw requests" />
    <mon-filter-bar [state]="filters" [showAuto]="false" />

    <div class="mt-5 inline-flex rounded-xl bg-slate-100 p-1">
      <button type="button" class="mon-tab" [class.mon-tab-active]="tab() === 'endpoints'" (click)="setTab('endpoints')">Endpoints</button>
      <button type="button" class="mon-tab" [class.mon-tab-active]="tab() === 'requests'" (click)="setTab('requests')">Requests</button>
    </div>

    @if (tab() === 'endpoints') {
      <div class="mt-4 flex flex-wrap gap-3">
        <input class="mon-field w-64" placeholder="Search endpoint…" [(ngModel)]="search" (keyup.enter)="applyEndpoints()" />
        <input class="mon-field w-36" placeholder="Status e.g. 500" [(ngModel)]="status" (keyup.enter)="applyEndpoints()" />
        <button type="button" class="mon-btn-primary" (click)="applyEndpoints()">Search</button>
      </div>
      <div class="mt-4">
        <mon-state [loading]="loading()" [error]="error()" [empty]="endpoints().length === 0" (retry)="loadEndpoints()">
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead>
                <tr>
                  <th class="mon-th">Method</th><th class="mon-th">Endpoint</th>
                  @for (c of cols; track c.key) {
                    <th class="mon-th cursor-pointer select-none text-right hover:text-slate-800" (click)="sort(c.key)">
                      {{ c.label }} @if (sortBy() === c.key) { <span>{{ sortDir() === 'asc' ? '▲' : '▼' }}</span> }
                    </th>
                  }
                  <th class="mon-th text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                @for (e of endpoints(); track e.method + e.endpoint) {
                  <tr class="mon-row cursor-pointer" (click)="drill(e)" title="View requests">
                    <td class="mon-td"><span class="mon-badge" [class]="methodClass(e.method)">{{ e.method }}</span></td>
                    <td class="mon-td max-w-md truncate font-mono text-xs">{{ e.endpoint }}</td>
                    <td class="mon-td text-right tabular-nums">{{ num(e.requests) }}</td>
                    <td class="mon-td text-right tabular-nums" [class.text-red-600]="e.errors > 0">{{ num(e.errors) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(e.avgMs) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(e.p95Ms) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(e.p99Ms) }}</td>
                    <td class="mon-td text-right tabular-nums text-slate-400">{{ ms(e.maxMs) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
          </div>
        </mon-state>
      </div>
    } @else {
      <div class="mt-4 flex flex-wrap gap-3">
        <input class="mon-field w-64" placeholder="Endpoint" [(ngModel)]="rEndpoint" (keyup.enter)="applyRequests()" />
        <select class="mon-field" [(ngModel)]="rMethod">
          <option value="">Any method</option>
          @for (m of methods; track m) { <option [value]="m">{{ m }}</option> }
        </select>
        <input class="mon-field w-32" placeholder="Status" [(ngModel)]="rStatus" (keyup.enter)="applyRequests()" />
        <input class="mon-field w-36" type="number" min="0" placeholder="Min duration ms" [(ngModel)]="rMinMs" (keyup.enter)="applyRequests()" />
        <input class="mon-field w-64 font-mono text-xs" placeholder="Correlation ID" [(ngModel)]="rCorrelation" (keyup.enter)="applyRequests()" />
        <button type="button" class="mon-btn-primary" (click)="applyRequests()">Filter</button>
      </div>
      <div class="mt-4">
        <mon-state [loading]="loading()" [error]="error()" [empty]="requests().length === 0" (retry)="loadRequests()">
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead>
                <tr>
                  <th class="mon-th">Time</th><th class="mon-th">Tenant</th><th class="mon-th">Method</th><th class="mon-th">Endpoint</th>
                  <th class="mon-th">Status</th><th class="mon-th text-right">Duration</th><th class="mon-th">Source</th><th class="mon-th">Version</th><th class="mon-th">Correlation ID</th>
                </tr>
              </thead>
              <tbody>
                @for (r of requests(); track $index) {
                  <tr class="mon-row">
                    <td class="mon-td whitespace-nowrap text-xs">{{ dt(r.eventTime) }}</td>
                    <td class="mon-td">{{ r.tenantId ?? '–' }}</td>
                    <td class="mon-td"><span class="mon-badge" [class]="methodClass(r.method)">{{ r.method }}</span></td>
                    <td class="mon-td max-w-sm truncate font-mono text-xs">{{ r.endpoint }}</td>
                    <td class="mon-td"><span class="mon-badge ring-1" [class]="statusClass(r.statusCode)">{{ r.statusCode }}</span></td>
                    <td class="mon-td text-right tabular-nums" [class.text-amber-600]="r.responseTimeMs > 1000">{{ ms(r.responseTimeMs) }}</td>
                    <td class="mon-td">{{ r.requestSource || '–' }}</td>
                    <td class="mon-td text-xs text-slate-500">{{ r.applicationVersion || '–' }}</td>
                    <td class="mon-td font-mono text-xs text-slate-500">{{ r.correlationId || '–' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
          </div>
        </mon-state>
      </div>
    }
  `,
})
export class MonitoringApiPerformance {
  private readonly api = inject(MonitoringApiPerformanceService);

  readonly filters = new FilterState({ range: '24h' });
  readonly pageSize = 25;
  readonly tab = signal<Tab>('endpoints');
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly endpoints = signal<EndpointStat[]>([]);
  readonly requests = signal<ApiRequestRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly sortBy = signal<SortKey>('requests');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  search = '';
  status = '';
  rEndpoint = '';
  rMethod = '';
  rStatus = '';
  rMinMs: number | null = null;
  rCorrelation = '';

  readonly methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  readonly cols: { key: SortKey; label: string }[] = [
    { key: 'requests', label: 'Requests' },
    { key: 'errors', label: 'Errors' },
    { key: 'avgMs', label: 'Avg' },
    { key: 'p95Ms', label: 'P95' },
    { key: 'p99Ms', label: 'P99' },
  ];

  readonly num = fmtNum;
  readonly ms = fmtMs;
  readonly dt = fmtDateTime;
  readonly methodClass = methodClass;
  readonly statusClass = statusClass;

  constructor() {
    effect(() => {
      this.filters.version();
      untracked(() => {
        this.page.set(1);
        this.reload();
      });
    });
  }

  setTab(t: Tab): void {
    if (this.tab() === t) return;
    this.tab.set(t);
    this.page.set(1);
    this.total.set(0);
    this.reload();
  }

  reload(): void {
    if (this.tab() === 'endpoints') this.loadEndpoints();
    else this.loadRequests();
  }

  applyEndpoints(): void {
    this.page.set(1);
    this.loadEndpoints();
  }

  applyRequests(): void {
    this.page.set(1);
    this.loadRequests();
  }

  sort(key: SortKey): void {
    if (this.sortBy() === key) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortBy.set(key);
      this.sortDir.set('desc');
    }
    this.page.set(1);
    this.loadEndpoints();
  }

  goPage(p: number): void {
    this.page.set(p);
    this.reload();
  }

  drill(e: EndpointStat): void {
    this.rEndpoint = e.endpoint;
    this.rMethod = e.method;
    this.rStatus = '';
    this.rMinMs = null;
    this.rCorrelation = '';
    this.setTab('requests');
  }

  loadEndpoints(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .endpoints({
        ...this.filters.params(),
        search: this.search.trim(),
        status: this.status.trim(),
        sortBy: this.sortBy(),
        sortDir: this.sortDir(),
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (r) => {
          this.endpoints.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (e: MonitoringApiError) => {
          this.error.set(e);
          this.loading.set(false);
        },
      });
  }

  loadRequests(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .requests({
        ...this.filters.params(),
        endpoint: this.rEndpoint.trim(),
        method: this.rMethod,
        status: this.rStatus.trim(),
        minDurationMs: this.rMinMs ?? undefined,
        correlationId: this.rCorrelation.trim(),
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (r) => {
          this.requests.set(r.items);
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
