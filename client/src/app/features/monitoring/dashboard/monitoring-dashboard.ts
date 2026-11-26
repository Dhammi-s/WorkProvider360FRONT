/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DashboardBreakdowns, DashboardSummary, Timeseries } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringDashboardService } from '../services/monitoring-dashboard.service';
import { FilterState } from '../shared/filter-state';
import { fmtBucket, fmtMs, fmtNum, fmtPct, methodClass, shortEndpoint } from '../shared/format';
import { CHART_PALETTE, ChartSeries, MonChart } from '../shared/mon-chart';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonKpi } from '../shared/mon-kpi';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonState } from '../shared/mon-state';

/** Overview dashboard: KPIs and eight charts for the selected time range. */
@Component({
  selector: 'app-monitoring-dashboard',
  imports: [MonChart, MonFilterBar, MonKpi, MonPageHeader, MonState],
  template: `
    <mon-page-header title="Dashboard" subtitle="Platform-wide request volume, latency and errors" />
    <mon-filter-bar [state]="filters" />

    <div class="mt-5">
      <mon-state [loading]="loading()" [error]="error()" [empty]="!summary()" (retry)="load()">
        @if (summary(); as s) {
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <mon-kpi label="Total requests" [value]="num(s.totalRequests)" dot="bg-brand-500" />
            <mon-kpi label="Successful" [value]="num(s.successfulRequests)" [hint]="successRate()" dot="bg-emerald-500" />
            <mon-kpi label="Failed" [value]="num(s.failedRequests)" [hint]="failRate()" dot="bg-red-500" />
            <mon-kpi label="Exceptions" [value]="num(s.totalExceptions)" dot="bg-red-500" />
            <mon-kpi label="Avg response" [value]="ms(s.avgResponseMs)" dot="bg-sky-500" />
            <mon-kpi label="P95 response" [value]="ms(s.p95ResponseMs)" dot="bg-amber-500" />
            <mon-kpi label="Active tenants" [value]="num(s.activeTenants)" dot="bg-accent-500" />
            <mon-kpi label="Slow requests" [value]="num(s.slowRequests)" dot="bg-amber-500" />
          </div>

          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Requests over time</h2>
              <mon-chart type="line" [labels]="timeLabels()" [datasets]="requestsSeries()" ariaLabel="Requests over time" />
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Errors over time</h2>
              <mon-chart type="bar" [labels]="timeLabels()" [datasets]="errorsSeries()" ariaLabel="Errors over time" />
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Response time trends</h2>
              <mon-chart type="line" [labels]="timeLabels()" [datasets]="latencySeries()" unit=" ms" ariaLabel="Response time trends" />
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Requests by tenant</h2>
              @if (tenantLabels().length) {
                <mon-chart type="bar" [horizontal]="true" [labels]="tenantLabels()" [datasets]="tenantSeries()" ariaLabel="Requests by tenant" />
              } @else { <p class="py-16 text-center text-sm text-slate-400">No tenant data</p> }
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Status code distribution</h2>
              @if (statusLabels().length) {
                <mon-chart type="doughnut" [labels]="statusLabels()" [datasets]="statusSeries()" ariaLabel="Status code distribution" />
              } @else { <p class="py-16 text-center text-sm text-slate-400">No data</p> }
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Web vs mobile</h2>
              @if (sourceLabels().length) {
                <mon-chart type="doughnut" [labels]="sourceLabels()" [datasets]="sourceSeries()" ariaLabel="Requests by client source" />
              } @else { <p class="py-16 text-center text-sm text-slate-400">No data</p> }
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Top 10 slowest APIs (ms)</h2>
              @if (slowLabels().length) {
                <mon-chart type="bar" [horizontal]="true" [labels]="slowLabels()" [datasets]="slowSeries()" unit=" ms" [height]="320" ariaLabel="Slowest APIs" />
              } @else { <p class="py-16 text-center text-sm text-slate-400">No data</p> }
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Top 10 APIs by errors</h2>
              @if (errLabels().length) {
                <mon-chart type="bar" [horizontal]="true" [labels]="errLabels()" [datasets]="errSeries()" [height]="320" ariaLabel="APIs with most errors" />
              } @else { <p class="py-16 text-center text-sm text-slate-400">No errors recorded</p> }
            </section>
          </div>
        }
      </mon-state>
    </div>
  `,
})
export class MonitoringDashboard {
  private readonly api = inject(MonitoringDashboardService);

  readonly filters = new FilterState({ range: '24h', autoSeconds: 30 });
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly series = signal<Timeseries | null>(null);
  readonly breakdowns = signal<DashboardBreakdowns | null>(null);
  private spanMs = 24 * 3_600_000;

  readonly num = fmtNum;
  readonly ms = fmtMs;

  readonly successRate = computed(() => this.rate(this.summary()?.successfulRequests));
  readonly failRate = computed(() => this.rate(this.summary()?.failedRequests));

  readonly timeLabels = computed(() => {
    const t = this.series();
    return (t?.points ?? []).map((p) => fmtBucket(p.time, t?.bucketSeconds ?? 60, this.spanMs));
  });
  readonly requestsSeries = computed<ChartSeries[]>(() => [
    { label: 'Requests', data: (this.series()?.points ?? []).map((p) => p.requests), color: CHART_PALETTE[0], fill: true },
  ]);
  readonly errorsSeries = computed<ChartSeries[]>(() => [
    { label: 'Errors', data: (this.series()?.points ?? []).map((p) => p.errors), color: CHART_PALETTE[3] },
  ]);
  readonly latencySeries = computed<ChartSeries[]>(() => [
    { label: 'Avg', data: (this.series()?.points ?? []).map((p) => p.avgMs), color: CHART_PALETTE[4] },
    { label: 'P95', data: (this.series()?.points ?? []).map((p) => p.p95Ms), color: CHART_PALETTE[2] },
  ]);

  readonly tenantLabels = computed(() => (this.breakdowns()?.byTenant ?? []).slice(0, 10).map((t) => t.tenantName || `#${t.tenantId}`));
  readonly tenantSeries = computed<ChartSeries[]>(() => [
    { label: 'Requests', data: (this.breakdowns()?.byTenant ?? []).slice(0, 10).map((t) => t.requests), color: CHART_PALETTE[0] },
  ]);
  readonly statusLabels = computed(() => (this.breakdowns()?.statusCodes ?? []).map((s) => String(s.statusCode)));
  readonly statusSeries = computed<ChartSeries[]>(() => [
    {
      label: 'Responses',
      data: (this.breakdowns()?.statusCodes ?? []).map((s) => s.count),
      colors: (this.breakdowns()?.statusCodes ?? []).map((s) => statusColor(s.statusCode)),
    },
  ]);
  readonly sourceLabels = computed(() => (this.breakdowns()?.bySource ?? []).map((s) => s.source || 'Unknown'));
  readonly sourceSeries = computed<ChartSeries[]>(() => [
    { label: 'Requests', data: (this.breakdowns()?.bySource ?? []).map((s) => s.count) },
  ]);
  readonly slowLabels = computed(() => (this.breakdowns()?.slowestApis ?? []).slice(0, 10).map((a) => `${a.method} ${shortEndpoint(a.endpoint)}`));
  readonly slowSeries = computed<ChartSeries[]>(() => [
    { label: 'Avg', data: (this.breakdowns()?.slowestApis ?? []).slice(0, 10).map((a) => a.avgMs), color: CHART_PALETTE[4] },
    { label: 'P95', data: (this.breakdowns()?.slowestApis ?? []).slice(0, 10).map((a) => a.p95Ms), color: CHART_PALETTE[2] },
  ]);
  readonly errLabels = computed(() => (this.breakdowns()?.errorApis ?? []).slice(0, 10).map((a) => `${a.method} ${shortEndpoint(a.endpoint)}`));
  readonly errSeries = computed<ChartSeries[]>(() => [
    { label: 'Errors', data: (this.breakdowns()?.errorApis ?? []).slice(0, 10).map((a) => a.errors), color: CHART_PALETTE[3] },
  ]);

  readonly methodClass = methodClass;
  readonly pct = fmtPct;

  constructor() {
    effect(() => {
      this.filters.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    const q = this.filters.params();
    const { from, to } = this.filters.resolve();
    this.spanMs = new Date(to).getTime() - new Date(from).getTime();
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      summary: this.api.summary(q),
      series: this.api.timeseries(q),
      breakdowns: this.api.breakdowns(q),
    }).subscribe({
      next: (r) => {
        this.summary.set(r.summary);
        this.series.set(r.series);
        this.breakdowns.set(r.breakdowns);
        this.loading.set(false);
      },
      error: (e: MonitoringApiError) => {
        this.error.set(e);
        this.loading.set(false);
      },
    });
  }

  private rate(n: number | undefined): string {
    const total = this.summary()?.totalRequests ?? 0;
    return n !== undefined && total > 0 ? fmtPct(n / total) + ' of requests' : '';
  }
}

function statusColor(code: number): string {
  if (code >= 500) return '#ef4444';
  if (code >= 400) return '#f59e0b';
  if (code >= 300) return '#0ea5e9';
  return '#10b981';
}
