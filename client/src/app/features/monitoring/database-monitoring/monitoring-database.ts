/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatabaseOverview } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringDatabaseService } from '../services/monitoring-database.service';
import { FilterState } from '../shared/filter-state';
import { fmtBucket, fmtMs, fmtNum } from '../shared/format';
import { CHART_PALETTE, ChartSeries, MonChart } from '../shared/mon-chart';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonKpi } from '../shared/mon-kpi';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonState } from '../shared/mon-state';

/** Database operation volume, latency and slowest operations. */
@Component({
  selector: 'app-monitoring-database',
  imports: [MonChart, MonFilterBar, MonKpi, MonPageHeader, MonState],
  template: `
    <mon-page-header title="Database Monitoring" subtitle="Operation volume, failures and latency per database" />
    <mon-filter-bar [state]="filters" />

    <div class="mt-5">
      <mon-state [loading]="loading()" [error]="error()" [empty]="!data()" (retry)="load()">
        @if (data(); as d) {
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <mon-kpi label="Operations" [value]="num(d.summary.operations)" dot="bg-brand-500" />
            <mon-kpi label="Failures" [value]="num(d.summary.failures)" dot="bg-red-500" />
            <mon-kpi label="Avg duration" [value]="ms(d.summary.avgMs)" dot="bg-sky-500" />
            <mon-kpi label="P95 duration" [value]="ms(d.summary.p95Ms)" dot="bg-amber-500" />
          </div>

          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Operations &amp; failures over time</h2>
              <mon-chart type="line" [labels]="timeLabels()" [datasets]="opsSeries()" ariaLabel="Database operations over time" />
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Average duration over time</h2>
              <mon-chart type="line" [labels]="timeLabels()" [datasets]="avgSeries()" unit=" ms" ariaLabel="Average database duration" />
            </section>
          </div>

          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            <section class="mon-card overflow-x-auto">
              <h2 class="px-5 pt-5 text-sm font-semibold text-slate-700">By database</h2>
              <table class="mon-table mt-3">
                <thead><tr><th class="mon-th">Database</th><th class="mon-th text-right">Operations</th><th class="mon-th text-right">Failures</th><th class="mon-th text-right">Avg</th><th class="mon-th text-right">P95</th></tr></thead>
                <tbody>
                  @for (b of d.byDatabase; track b.databaseName) {
                    <tr class="mon-row">
                      <td class="mon-td font-semibold">{{ b.databaseName }}</td>
                      <td class="mon-td text-right tabular-nums">{{ num(b.operations) }}</td>
                      <td class="mon-td text-right tabular-nums" [class.text-red-600]="b.failures > 0">{{ num(b.failures) }}</td>
                      <td class="mon-td text-right tabular-nums">{{ ms(b.avgMs) }}</td>
                      <td class="mon-td text-right tabular-nums">{{ ms(b.p95Ms) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
            <section class="mon-card p-5">
              <h2 class="mb-3 text-sm font-semibold text-slate-700">Operations by database</h2>
              <mon-chart type="doughnut" [labels]="dbLabels()" [datasets]="dbSeries()" ariaLabel="Operations by database" />
            </section>
          </div>

          <section class="mon-card mt-5 overflow-x-auto">
            <h2 class="px-5 pt-5 text-sm font-semibold text-slate-700">Slowest operations</h2>
            <table class="mon-table mt-3">
              <thead><tr><th class="mon-th">Database</th><th class="mon-th">Operation</th><th class="mon-th text-right">Calls</th><th class="mon-th text-right">Avg</th><th class="mon-th text-right">P95</th><th class="mon-th text-right">Max</th></tr></thead>
              <tbody>
                @for (o of d.slowestOperations; track $index) {
                  <tr class="mon-row">
                    <td class="mon-td">{{ o.databaseName }}</td>
                    <td class="mon-td max-w-xl truncate font-mono text-xs">{{ o.operation }}</td>
                    <td class="mon-td text-right tabular-nums">{{ num(o.calls) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(o.avgMs) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ ms(o.p95Ms) }}</td>
                    <td class="mon-td text-right tabular-nums text-slate-400">{{ ms(o.maxMs) }}</td>
                  </tr>
                } @empty {
                  <tr><td class="mon-td text-center text-slate-400" colspan="6">No operations recorded</td></tr>
                }
              </tbody>
            </table>
          </section>
        }
      </mon-state>
    </div>
  `,
})
export class MonitoringDatabase {
  private readonly api = inject(MonitoringDatabaseService);

  readonly filters = new FilterState({ range: '24h' });
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly data = signal<DatabaseOverview | null>(null);
  private spanMs = 24 * 3_600_000;

  readonly num = fmtNum;
  readonly ms = fmtMs;

  readonly timeLabels = computed(() => (this.data()?.timeseries ?? []).map((p) => fmtBucket(p.time, 60, this.spanMs)));
  readonly opsSeries = computed<ChartSeries[]>(() => [
    { label: 'Operations', data: (this.data()?.timeseries ?? []).map((p) => p.operations), color: CHART_PALETTE[0], fill: true },
    { label: 'Failures', data: (this.data()?.timeseries ?? []).map((p) => p.failures), color: CHART_PALETTE[3] },
  ]);
  readonly avgSeries = computed<ChartSeries[]>(() => [
    { label: 'Avg', data: (this.data()?.timeseries ?? []).map((p) => p.avgMs), color: CHART_PALETTE[4] },
  ]);
  readonly dbLabels = computed(() => (this.data()?.byDatabase ?? []).map((b) => b.databaseName));
  readonly dbSeries = computed<ChartSeries[]>(() => [
    { label: 'Operations', data: (this.data()?.byDatabase ?? []).map((b) => b.operations) },
  ]);

  constructor() {
    effect(() => {
      this.filters.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    const { from, to } = this.filters.resolve();
    this.spanMs = new Date(to).getTime() - new Date(from).getTime();
    this.loading.set(true);
    this.error.set(null);
    this.api.overview(this.filters.params()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e: MonitoringApiError) => {
        this.error.set(e);
        this.loading.set(false);
      },
    });
  }
}
