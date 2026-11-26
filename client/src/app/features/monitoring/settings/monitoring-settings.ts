/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonitoringAuthService } from '../auth/monitoring-auth.service';
import { MonitoringHealth, MonitoringSetting } from '../models/monitoring.models';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringSettingsService } from '../services/monitoring-settings.service';
import { fmtNum } from '../shared/format';
import { MonPageHeader } from '../shared/mon-page-header';
import { MonState } from '../shared/mon-state';

/** Monitoring configuration (editable with settings.manage) and system health. */
@Component({
  selector: 'app-monitoring-settings',
  imports: [FormsModule, MonPageHeader, MonState],
  template: `
    <mon-page-header title="Settings" subtitle="Telemetry configuration and backend health">
      <button type="button" class="mon-btn-ghost" (click)="loadHealth()">Re-check health</button>
    </mon-page-header>

    <section class="mon-card p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">System health</h2>
      @if (healthError(); as he) {
        <p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{{ he }}</p>
      } @else if (health(); as h) {
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-slate-100 p-4">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" [class]="h.clickHouse.healthy ? 'bg-emerald-500' : 'bg-red-500'"></span>
              <span class="text-sm font-semibold text-slate-800">ClickHouse</span>
              <span class="mon-badge ml-auto" [class]="h.clickHouse.healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">{{ h.clickHouse.healthy ? 'Healthy' : 'Unhealthy' }}</span>
            </div>
            <p class="mt-2 text-sm text-slate-500">{{ h.clickHouse.message }}</p>
            <p class="mt-1 text-xs text-slate-400">Latency {{ h.clickHouse.latencyMs }} ms</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            @for (t of telemetryTiles(h); track t.label) {
              <div class="rounded-xl border border-slate-100 p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{{ t.label }}</p>
                <p class="mt-1 text-xl font-extrabold" [class]="t.warn ? 'text-red-600' : 'text-slate-900'">{{ num(t.value) }}</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <p class="text-sm text-slate-400">Loading…</p>
      }
    </section>

    <section class="mon-card mt-5">
      <div class="flex items-center justify-between px-5 pt-5">
        <h2 class="text-sm font-semibold text-slate-700">Configuration</h2>
        @if (canManage) {
          <button type="button" class="mon-btn-primary" [disabled]="saving() || !dirty()" (click)="save()">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
        } @else {
          <span class="text-xs text-slate-400">Read-only: requires settings.manage</span>
        }
      </div>
      @if (message()) { <p class="mx-5 mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{{ message() }}</p> }
      @if (saveError()) { <p class="mx-5 mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ saveError() }}</p> }
      <div class="p-5">
        <mon-state [loading]="loading()" [error]="error()" [empty]="settings().length === 0" emptyTitle="No settings" emptyHint="No configurable settings were returned." (retry)="load()">
          <div class="divide-y divide-slate-100">
            @for (s of settings(); track s.key) {
              <div class="grid gap-2 py-3 md:grid-cols-[18rem_1fr] md:items-center">
                <div>
                  <p class="font-mono text-xs font-semibold text-slate-800">{{ s.key }}</p>
                  @if (s.description) { <p class="text-xs text-slate-400">{{ s.description }}</p> }
                </div>
                <input class="mon-field w-full" [ngModel]="s.value" (ngModelChange)="edit(s.key, $event)" [disabled]="!canManage" [attr.aria-label]="s.key" />
              </div>
            }
          </div>
        </mon-state>
      </div>
    </section>
  `,
})
export class MonitoringSettings {
  private readonly api = inject(MonitoringSettingsService);
  private readonly auth = inject(MonitoringAuthService);

  readonly canManage = this.auth.hasPermission('settings.manage');
  readonly loading = signal(false);
  readonly error = signal<MonitoringApiError | null>(null);
  readonly settings = signal<MonitoringSetting[]>([]);
  readonly health = signal<MonitoringHealth | null>(null);
  readonly healthError = signal('');
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly message = signal('');
  readonly dirty = signal(false);
  readonly num = fmtNum;
  private readonly edits = new Map<string, string>();

  constructor() {
    this.load();
    this.loadHealth();
  }

  telemetryTiles(h: MonitoringHealth): { label: string; value: number; warn: boolean }[] {
    return [
      { label: 'Queued', value: h.telemetry.queued, warn: false },
      { label: 'Sent', value: h.telemetry.sent, warn: false },
      { label: 'Dropped', value: h.telemetry.dropped, warn: h.telemetry.dropped > 0 },
      { label: 'Failed batches', value: h.telemetry.failedBatches, warn: h.telemetry.failedBatches > 0 },
    ];
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.edits.clear();
    this.dirty.set(false);
    this.api.list().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.loading.set(false);
      },
      error: (e: MonitoringApiError) => {
        this.error.set(e);
        this.loading.set(false);
      },
    });
  }

  loadHealth(): void {
    this.healthError.set('');
    this.api.health().subscribe({
      next: (h) => this.health.set(h),
      error: (e: MonitoringApiError) => this.healthError.set(e.forbidden ? 'You do not have access to health data.' : e.message),
    });
  }

  edit(key: string, value: string): void {
    const original = this.settings().find((s) => s.key === key)?.value;
    if (value === original) this.edits.delete(key);
    else this.edits.set(key, value);
    this.dirty.set(this.edits.size > 0);
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set('');
    this.message.set('');
    const payload = [...this.edits.entries()].map(([key, value]) => ({ key, value }));
    this.api.save(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Settings saved.');
        this.load();
      },
      error: (e: MonitoringApiError) => {
        this.saving.set(false);
        this.saveError.set(e.message);
      },
    });
  }
}
