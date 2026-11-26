/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TenantCompareRow, TenantOverview, TenantStat } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringTenantsService } from '../services/monitoring-tenants.service';
import { FilterState } from '../shared/filter-state';
import { fmtBucket, fmtMs, fmtNum, fmtPct, shortEndpoint } from '../shared/format';
import { CHART_PALETTE, ChartSeries, MonChart } from '../shared/mon-chart';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonKpi } from '../shared/mon-kpi';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonPager } from '../shared/mon-pager';
import { MonState } from '../shared/mon-state';

type SortKey = 'requests' | 'errors' | 'errorRate' | 'avgMs' | 'p95Ms';

/** Per-tenant health table with drill-down overview and side-by-side comparison. */
@Component({
  selector: 'app-monitoring-tenants',
  imports: [FormsModule, MonChart, MonFilterBar, MonKpi, MonPageHeader, MonPager, MonState],
  template: `
    <mon-page-header title="Tenant Monitoring" subtitle="Request volume, errors and latency per agency" />
    <mon-filter-bar [state]="filters" [showTenant]="false" />

    @if (detailId() === null) {
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <input class="mon-field w-72" placeholder="Search by Agency ID or name…" [(ngModel)]="search" (keyup.enter)="apply()" />
        <button type="button" class="mon-btn-primary" (click)="apply()">Search</button>
        <button type="button" class="mon-btn-ghost ml-auto" [disabled]="selected().length < 2" (click)="compare()">
          Compare selected ({{ selected().length }})
        </button>
      </div>

      @if (compareRows().length) {
        <section class="mon-card mt-4 p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-700">Tenant comparison</h2>
            <button type="button" class="text-xs font-semibold text-slate-400 hover:text-slate-700" (click)="compareRows.set([])">Clear</button>
          </div>
          <div class="grid gap-5 lg:grid-cols-2">
            <mon-chart type="bar" [labels]="cmpLabels()" [datasets]="cmpRequests()" ariaLabel="Requests and errors by tenant" />
            <mon-chart type="bar" [labels]="cmpLabels()" [datasets]="cmpLatency()" unit=" ms" ariaLabel="Latency by tenant" />
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="mon-table">
              <thead><tr><th class="mon-th">Tenant</th><th class="mon-th text-right">Requests</th><th class="mon-th text-right">Errors</th><th class="mon-th text-right">Error rate</th><th class="mon-th text-right">Avg</th><th class="mon-th text-right">P95</th></tr></thead>
              <tbody>
                @for (c of compareRows(); track c.tenantId) {
                  <tr class="mon-row">
                    <td class="mon-td font-semibold">{{ c.tenantName }} <span class="text-xs text-slate-400">#{{ c.tenantId }}</span></td>
                    <td class="mon-td text-right tabular-nums">{{ num(c.requests) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ num(c.errors) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ pct(c.errorRate) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(c.avgMs) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(c.p95Ms) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <div class="mt-4">
        <mon-state [loading]="loading()" [error]="error()" [empty]="rows().length === 0" emptyTitle="No tenants found" (retry)="load()">
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead>
                <tr>
                  <th class="mon-th w-10"></th><th class="mon-th">Tenant</th>
                  @for (c of cols; track c.key) {
                    <th class="mon-th cursor-pointer select-none text-right hover:text-slate-800" (click)="sort(c.key)">
                      {{ c.label }} @if (sortBy() === c.key) { <span>{{ sortDir() === 'asc' ? '▲' : '▼' }}</span> }
                    </th>
                  }
                  <th class="mon-th text-right">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                @for (t of rows(); track t.tenantId) {
                  <tr class="mon-row cursor-pointer" (click)="open(t.tenantId)">
                    <td class="mon-td" (click)="$event.stopPropagation()">
                      <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" [checked]="selected().includes(t.tenantId)" (change)="toggle(t.tenantId)" [attr.aria-label]="'Select ' + t.tenantName" />
                    </td>
                    <td class="mon-td font-semibold">{{ t.tenantName }} <span class="text-xs font-normal text-slate-400">#{{ t.tenantId }}</span></td>
                    <td class="mon-td text-right tabular-nums">{{ num(t.requests) }}</td>
                    <td class="mon-td text-right tabular-nums" [class.text-red-600]="t.errors > 0">{{ num(t.errors) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ pct(t.errorRate) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(t.avgMs) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(t.p95Ms) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ num(t.exceptions) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
          </div>
        </mon-state>
      </div>
    } @else {
      <button type="button" class="mon-btn-ghost mt-4" (click)="closeDetail()">← All tenants</button>
      <div class="mt-4">
        <mon-state [loading]="detailLoading()" [error]="detailError()" [empty]="!detail()" (retry)="open(detailId()!)">
          @if (detail(); as d) {
            <h2 class="mb-3 text-lg font-extrabold text-slate-900">{{ d.tenantName }} <span class="text-sm font-medium text-slate-400">#{{ d.tenantId }}</span></h2>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
              <mon-kpi label="Requests" [value]="num(d.summary.totalRequests)" dot="bg-brand-500" />
              <mon-kpi label="Failed" [value]="num(d.summary.failedRequests)" dot="bg-red-500" />
              <mon-kpi label="Avg response" [value]="ms(d.summary.avgResponseMs)" dot="bg-sky-500" />
              <mon-kpi label="P95 response" [value]="ms(d.summary.p95ResponseMs)" dot="bg-amber-500" />
              <mon-kpi label="Exceptions" [value]="num(d.summary.totalExceptions)" dot="bg-red-500" />
              <mon-kpi label="Slow requests" [value]="num(d.summary.slowRequests)" dot="bg-amber-500" />
            </div>
            <div class="mt-5 grid gap-5 lg:grid-cols-2">
              <section class="mon-card p-5">
                <h3 class="mb-3 text-sm font-semibold text-slate-700">Requests &amp; errors</h3>
                <mon-chart type="line" [labels]="dLabels()" [datasets]="dReq()" ariaLabel="Tenant requests and errors" />
              </section>
              <section class="mon-card p-5">
                <h3 class="mb-3 text-sm font-semibold text-slate-700">Response time</h3>
                <mon-chart type="line" [labels]="dLabels()" [datasets]="dLat()" unit=" ms" ariaLabel="Tenant response time" />
              </section>
            </div>
            <div class="mt-5 grid gap-5 lg:grid-cols-2">
              <section class="mon-card overflow-x-auto">
                <h3 class="px-5 pt-5 text-sm font-semibold text-slate-700">Top errors</h3>
                <table class="mon-table mt-3">
                  <thead><tr><th class="mon-th">Exception</th><th class="mon-th text-right">Occurrences</th></tr></thead>
                  <tbody>
                    @for (e of d.topErrors; track $index) {
                      <tr class="mon-row"><td class="mon-td"><div class="font-semibold">{{ e.exceptionType }}</div><div class="truncate text-xs text-slate-500">{{ e.message }}</div></td><td class="mon-td text-right tabular-nums text-red-600">{{ num(e.occurrences) }}</td></tr>
                    } @empty { <tr><td class="mon-td text-center text-slate-400" colspan="2">No errors</td></tr> }
                  </tbody>
                </table>
              </section>
              <section class="mon-card overflow-x-auto">
                <h3 class="px-5 pt-5 text-sm font-semibold text-slate-700">Slowest APIs</h3>
                <table class="mon-table mt-3">
                  <thead><tr><th class="mon-th">Endpoint</th><th class="mon-th text-right">Requests</th><th class="mon-th text-right">Avg</th><th class="mon-th text-right">P95</th></tr></thead>
                  <tbody>
                    @for (a of d.slowestApis; track $index) {
                      <tr class="mon-row"><td class="mon-td font-mono text-xs">{{ a.method }} {{ short(a.endpoint) }}</td><td class="mon-td text-right tabular-nums">{{ num(a.requests) }}</td><td class="mon-td text-right tabular-nums">{{ ms(a.avgMs) }}</td><td class="mon-td text-right tabular-nums">{{ ms(a.p95Ms) }}</td></tr>
                    } @empty { <tr><td class="mon-td text-center text-slate-400" colspan="4">No data</td></tr> }
                  </tbody>
                </table>
              </section>
            </div>
          }
        </mon-state>
      </div>
    }
  `,
})
export class MonitoringTenants {
  private readonly api = inject(MonitoringTenantsService);

  readonly filters = new FilterState({ range: '24h' });
  readonly pageSize = 25;
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly rows = signal<TenantStat[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly sortBy = signal<SortKey>('requests');
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  search = '';

  readonly selected = signal<number[]>([]);
  readonly compareRows = signal<TenantCompareRow[]>([]);

  readonly detailId = signal<number | null>(null);
  readonly detail = signal<TenantOverview | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<MonitoringApiError | null>(null);

  readonly cols: { key: SortKey; label: string }[] = [
    { key: 'requests', label: 'Requests' },
    { key: 'errors', label: 'Errors' },
    { key: 'errorRate', label: 'Error rate' },
    { key: 'avgMs', label: 'Avg' },
    { key: 'p95Ms', label: 'P95' },
  ];

  readonly num = fmtNum;
  readonly ms = fmtMs;
  readonly pct = fmtPct;
  readonly short = shortEndpoint;

  readonly cmpLabels = computed(() => this.compareRows().map((c) => c.tenantName || `#${c.tenantId}`));
  readonly cmpRequests = computed<ChartSeries[]>(() => [
    { label: 'Requests', data: this.compareRows().map((c) => c.requests), color: CHART_PALETTE[0] },
    { label: 'Errors', data: this.compareRows().map((c) => c.errors), color: CHART_PALETTE[3] },
  ]);
  readonly cmpLatency = computed<ChartSeries[]>(() => [
    { label: 'Avg', data: this.compareRows().map((c) => c.avgMs), color: CHART_PALETTE[4] },
    { label: 'P95', data: this.compareRows().map((c) => c.p95Ms), color: CHART_PALETTE[2] },
  ]);

  private spanMs = 24 * 3_600_000;
  readonly dLabels = computed(() => {
    const t = this.detail()?.timeseries;
    return (t?.points ?? []).map((p) => fmtBucket(p.time, t?.bucketSeconds ?? 60, this.spanMs));
  });
  readonly dReq = computed<ChartSeries[]>(() => [
    { label: 'Requests', data: (this.detail()?.timeseries.points ?? []).map((p) => p.requests), color: CHART_PALETTE[0], fill: true },
    { label: 'Errors', data: (this.detail()?.timeseries.points ?? []).map((p) => p.errors), color: CHART_PALETTE[3] },
  ]);
  readonly dLat = computed<ChartSeries[]>(() => [
    { label: 'Avg', data: (this.detail()?.timeseries.points ?? []).map((p) => p.avgMs), color: CHART_PALETTE[4] },
    { label: 'P95', data: (this.detail()?.timeseries.points ?? []).map((p) => p.p95Ms), color: CHART_PALETTE[2] },
  ]);

  constructor() {
    effect(() => {
      this.filters.version();
      untracked(() => {
        const id = this.detailId();
        if (id !== null) this.open(id);
        else this.apply();
      });
    });
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  sort(key: SortKey): void {
    if (this.sortBy() === key) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortBy.set(key);
      this.sortDir.set('desc');
    }
    this.apply();
  }

  toggle(id: number): void {
    this.selected.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const { from, to } = this.filters.params(false);
    this.api
      .list({ from, to, search: this.search.trim(), sortBy: this.sortBy(), sortDir: this.sortDir(), page: this.page(), pageSize: this.pageSize })
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

  compare(): void {
    const { from, to } = this.filters.params(false);
    forkJoin([this.api.compare(this.selected(), { from, to })]).subscribe({
      next: ([rows]) => this.compareRows.set(rows),
      error: (e: MonitoringApiError) => this.error.set(e),
    });
  }

  open(id: number): void {
    const { from, to } = this.filters.params(false);
    this.spanMs = new Date(to as string).getTime() - new Date(from as string).getTime();
    this.detailId.set(id);
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.api.overview(id, { from, to }).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
      },
      error: (e: MonitoringApiError) => {
        this.detailError.set(e);
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.detailId.set(null);
    this.detail.set(null);
    this.load();
  }
}
