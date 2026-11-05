/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorEvent, ErrorGroup, ErrorTrace } from '../models/monitoring.models';
import { MonitoringAuthService } from '../auth/monitoring-auth.service';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringErrorsService } from '../services/monitoring-errors.service';
import { FilterState } from '../shared/filter-state';
import { fmtDateTime, fmtNum } from '../shared/format';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonPager } from '../shared/mon-pager';
import { MonState } from '../shared/mon-state';

type Tab = 'groups' | 'events';

/** Grouped exceptions (by fingerprint), raw error events and sanitised stack traces. */
@Component({
  selector: 'app-monitoring-errors',
  imports: [FormsModule, MonFilterBar, MonPageHeader, MonPager, MonState],
  template: `
    <mon-page-header title="Error Tracking" subtitle="Exceptions grouped by fingerprint, with per-event detail" />
    <mon-filter-bar [state]="filters" />

    <div class="mt-5 inline-flex rounded-xl bg-slate-100 p-1">
      <button type="button" class="mon-tab" [class.mon-tab-active]="tab() === 'groups'" (click)="setTab('groups')">Error groups</button>
      <button type="button" class="mon-tab" [class.mon-tab-active]="tab() === 'events'" (click)="setTab('events')">All errors</button>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <input class="mon-field w-64" placeholder="Search message / type…" [(ngModel)]="search" (keyup.enter)="apply()" />
      <input class="mon-field w-40" placeholder="Environment" [(ngModel)]="environment" (keyup.enter)="apply()" />
      @if (tab() === 'events') {
        <input class="mon-field w-56" placeholder="Exception type" [(ngModel)]="exceptionType" (keyup.enter)="apply()" />
        <input class="mon-field w-64 font-mono text-xs" placeholder="Fingerprint" [(ngModel)]="fingerprint" (keyup.enter)="apply()" />
        <input class="mon-field w-64 font-mono text-xs" placeholder="Correlation ID" [(ngModel)]="correlationId" (keyup.enter)="apply()" />
      }
      <button type="button" class="mon-btn-primary" (click)="apply()">Filter</button>
    </div>

    <div class="mt-4">
      @if (tab() === 'groups') {
        <mon-state [loading]="loading()" [error]="error()" [empty]="groups().length === 0" emptyTitle="No errors in this period" (retry)="load()">
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead>
                <tr><th class="mon-th">Exception</th><th class="mon-th text-right">Occurrences</th><th class="mon-th text-right">Tenants</th><th class="mon-th">Env</th><th class="mon-th">Version</th><th class="mon-th">First seen</th><th class="mon-th">Last seen</th></tr>
              </thead>
              <tbody>
                @for (g of groups(); track g.fingerprint) {
                  <tr class="mon-row cursor-pointer" (click)="openGroup(g)" title="View occurrences">
                    <td class="mon-td max-w-lg">
                      <div class="font-semibold text-slate-800">{{ g.exceptionType }}</div>
                      <div class="truncate text-xs text-slate-500">{{ g.message }}</div>
                    </td>
                    <td class="mon-td text-right font-semibold tabular-nums text-red-600">{{ num(g.occurrences) }}</td>
                    <td class="mon-td text-right tabular-nums">{{ g.tenantCount }}</td>
                    <td class="mon-td">{{ g.environment || '–' }}</td>
                    <td class="mon-td text-xs">{{ g.applicationVersion || '–' }}</td>
                    <td class="mon-td whitespace-nowrap text-xs">{{ dt(g.firstSeen) }}</td>
                    <td class="mon-td whitespace-nowrap text-xs">{{ dt(g.lastSeen) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
          </div>
        </mon-state>
      } @else {
        <mon-state [loading]="loading()" [error]="error()" [empty]="events().length === 0" emptyTitle="No errors in this period" (retry)="load()">
          <div class="mon-card overflow-x-auto">
            <table class="mon-table">
              <thead>
                <tr><th class="mon-th">Time</th><th class="mon-th">Tenant</th><th class="mon-th">Exception</th><th class="mon-th">Env</th><th class="mon-th">App / version</th><th class="mon-th">Correlation ID</th></tr>
              </thead>
              <tbody>
                @for (e of events(); track $index) {
                  <tr class="mon-row cursor-pointer" (click)="openEvent(e)">
                    <td class="mon-td whitespace-nowrap text-xs">{{ dt(e.eventTime) }}</td>
                    <td class="mon-td">{{ e.tenantName || e.tenantId || '–' }}</td>
                    <td class="mon-td max-w-lg">
                      <div class="font-semibold text-slate-800">{{ e.exceptionType }}</div>
                      <div class="truncate text-xs text-slate-500">{{ e.message }}</div>
                    </td>
                    <td class="mon-td">{{ e.environment || '–' }}</td>
                    <td class="mon-td text-xs">{{ e.applicationName || '–' }} {{ e.applicationVersion }}</td>
                    <td class="mon-td font-mono text-xs text-slate-500">{{ e.correlationId || '–' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <mon-pager [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
          </div>
        </mon-state>
      }
    </div>

    @if (selected(); as ev) {
      <div class="fixed inset-0 z-40 flex justify-end bg-slate-900/40" (click)="close()">
        <aside class="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()" role="dialog" aria-label="Error detail">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-extrabold text-slate-900">{{ ev.exceptionType }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ dt(ev.eventTime) }}</p>
            </div>
            <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100" (click)="close()" aria-label="Close">✕</button>
          </div>
          <p class="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{{ ev.message }}</p>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt class="text-xs text-slate-400">Tenant</dt><dd>{{ ev.tenantName || ev.tenantId || '–' }}</dd></div>
            <div><dt class="text-xs text-slate-400">Environment</dt><dd>{{ ev.environment || '–' }}</dd></div>
            <div><dt class="text-xs text-slate-400">Application</dt><dd>{{ ev.applicationName || '–' }} {{ ev.applicationVersion }}</dd></div>
            <div><dt class="text-xs text-slate-400">Correlation ID</dt><dd class="break-all font-mono text-xs">{{ ev.correlationId || '–' }}</dd></div>
            <div class="col-span-2"><dt class="text-xs text-slate-400">Fingerprint</dt><dd class="break-all font-mono text-xs">{{ ev.fingerprint || '–' }}</dd></div>
          </dl>

          <h3 class="mt-6 text-sm font-semibold text-slate-700">Stack trace</h3>
          @if (!canTrace) {
            <p class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Your role does not include permission to view stack traces.</p>
          } @else if (!ev.correlationId) {
            <p class="mt-2 text-sm text-slate-400">No correlation ID recorded for this event.</p>
          } @else if (traceLoading()) {
            <p class="mt-2 text-sm text-slate-400">Loading…</p>
          } @else if (traceError()) {
            <p class="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ traceError() }}</p>
          } @else if (trace(); as t) {
            <pre class="mt-2 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">{{ t.exceptionType }}: {{ t.message }}
{{ t.stackTrace }}</pre>
          } @else {
            <button type="button" class="mon-btn-ghost mt-2" (click)="loadTrace(ev)">Load stack trace</button>
          }
        </aside>
      </div>
    }
  `,
})
export class MonitoringErrors {
  private readonly api = inject(MonitoringErrorsService);
  private readonly auth = inject(MonitoringAuthService);

  readonly filters = new FilterState({ range: '24h' });
  readonly pageSize = 25;
  readonly tab = signal<Tab>('groups');
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly groups = signal<ErrorGroup[]>([]);
  readonly events = signal<ErrorEvent[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);

  readonly selected = signal<ErrorEvent | null>(null);
  readonly trace = signal<ErrorTrace | null>(null);
  readonly traceLoading = signal(false);
  readonly traceError = signal('');

  search = '';
  environment = '';
  exceptionType = '';
  fingerprint = '';
  correlationId = '';

  readonly canTrace = this.auth.hasPermission('stacktraces.view');
  readonly num = fmtNum;
  readonly dt = fmtDateTime;

  constructor() {
    effect(() => {
      this.filters.version();
      untracked(() => this.apply());
    });
  }

  setTab(t: Tab): void {
    if (this.tab() === t) return;
    this.tab.set(t);
    this.apply();
  }

  openGroup(g: ErrorGroup): void {
    this.fingerprint = g.fingerprint;
    this.search = '';
    this.exceptionType = '';
    this.correlationId = '';
    this.setTab('events');
  }

  openEvent(e: ErrorEvent): void {
    this.trace.set(null);
    this.traceError.set('');
    this.selected.set(e);
    if (this.canTrace && e.correlationId) this.loadTrace(e);
  }

  close(): void {
    this.selected.set(null);
    this.trace.set(null);
  }

  loadTrace(e: ErrorEvent): void {
    if (!e.correlationId) return;
    this.traceLoading.set(true);
    this.traceError.set('');
    this.api.trace(e.correlationId, e.eventTime).subscribe({
      next: (t) => {
        this.trace.set(t);
        this.traceLoading.set(false);
      },
      error: (err: MonitoringApiError) => {
        this.traceError.set(err.forbidden ? 'You do not have permission to view stack traces.' : err.message);
        this.traceLoading.set(false);
      },
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

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const base = {
      ...this.filters.params(),
      search: this.search.trim(),
      environment: this.environment.trim(),
      page: this.page(),
      pageSize: this.pageSize,
    };
    if (this.tab() === 'groups') {
      this.api.groups(base).subscribe({
        next: (r) => this.done(() => this.groups.set(r.items), r.total),
        error: (e: MonitoringApiError) => this.fail(e),
      });
    } else {
      this.api
        .events({ ...base, exceptionType: this.exceptionType.trim(), fingerprint: this.fingerprint.trim(), correlationId: this.correlationId.trim() })
        .subscribe({
          next: (r) => this.done(() => this.events.set(r.items), r.total),
          error: (e: MonitoringApiError) => this.fail(e),
        });
    }
  }

  private done(set: () => void, total: number): void {
    set();
    this.total.set(total);
    this.loading.set(false);
  }

  private fail(e: MonitoringApiError): void {
    this.error.set(e);
    this.loading.set(false);
  }
}
