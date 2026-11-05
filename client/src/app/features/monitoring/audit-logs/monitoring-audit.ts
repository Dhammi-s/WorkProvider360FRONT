/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogRow } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringAuditService } from '../services/monitoring-audit.service';
import { FilterState } from '../shared/filter-state';
import { fmtDateTime } from '../shared/format';
import { MonFilterBar } from '../shared/mon-filter-bar';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonPager } from '../shared/mon-pager';
import { MonState } from '../shared/mon-state';

/** Security audit trail of monitoring-area actions. */
@Component({
  selector: 'app-monitoring-audit',
  imports: [FormsModule, MonFilterBar, MonPageHeader, MonPager, MonState],
  template: `
    <mon-page-header title="Audit Logs" subtitle="Sign-ins, permission changes and other monitoring actions" />
    <mon-filter-bar [state]="filters" [showTenant]="false" [showAuto]="false" />

    <div class="mt-4 flex flex-wrap gap-3">
      <input class="mon-field w-56" placeholder="Action (e.g. Login)" [(ngModel)]="action" (keyup.enter)="apply()" />
      <input class="mon-field w-36" type="number" min="1" placeholder="User ID" [(ngModel)]="userId" (keyup.enter)="apply()" />
      <button type="button" class="mon-btn-primary" (click)="apply()">Filter</button>
    </div>

    <div class="mt-4">
      <mon-state [loading]="loading()" [error]="error()" [empty]="rows().length === 0" (retry)="load()">
        <div class="mon-card overflow-x-auto">
          <table class="mon-table">
            <thead>
              <tr><th class="mon-th">Time</th><th class="mon-th">User</th><th class="mon-th">Action</th><th class="mon-th">Description</th><th class="mon-th">IP address</th></tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr class="mon-row">
                  <td class="mon-td whitespace-nowrap text-xs">{{ dt(r.createdAt) }}</td>
                  <td class="mon-td">{{ r.userEmail || (r.monitoringUserId ? '#' + r.monitoringUserId : '–') }}</td>
                  <td class="mon-td"><span class="mon-badge bg-slate-100 text-slate-700">{{ r.action }}</span></td>
                  <td class="mon-td max-w-lg break-words">{{ r.description || '–' }}</td>
                  <td class="mon-td font-mono text-xs">{{ r.ipAddress || '–' }}</td>
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
export class MonitoringAudit {
  private readonly api = inject(MonitoringAuditService);

  readonly filters = new FilterState({ range: '7d' });
  readonly pageSize = 50;
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly rows = signal<AuditLogRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  action = '';
  userId: number | null = null;
  readonly dt = fmtDateTime;

  constructor() {
    effect(() => {
      this.filters.version();
      untracked(() => this.apply());
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
    const { from, to } = this.filters.resolve();
    this.api
      .list({ from, to, action: this.action.trim(), userId: this.userId ?? undefined, page: this.page(), pageSize: this.pageSize })
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
