/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AUTO_REFRESH_OPTIONS, FilterState, RANGE_OPTIONS, RangeKey } from './filter-state';

/** Time-range selector + optional tenant filter + auto-refresh controls bound to a FilterState. */
@Component({
  selector: 'mon-filter-bar',
  imports: [FormsModule],
  template: `
    <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
      <div>
        <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Time range</label>
        <select class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          [ngModel]="state().range()" (ngModelChange)="setRange($event)">
          @for (o of ranges; track o.key) { <option [value]="o.key">{{ o.label }}</option> }
        </select>
      </div>

      @if (state().range() === 'custom') {
        <div>
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">From</label>
          <input type="datetime-local" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            [ngModel]="state().customFrom()" (ngModelChange)="state().customFrom.set($event)" />
        </div>
        <div>
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">To</label>
          <input type="datetime-local" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            [ngModel]="state().customTo()" (ngModelChange)="state().customTo.set($event)" />
        </div>
        <button type="button" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          [disabled]="!state().customFrom() || !state().customTo()" (click)="state().bump()">Apply</button>
      }

      @if (showTenant()) {
        <div>
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tenant (Agency ID)</label>
          <input type="number" min="1" placeholder="All tenants" class="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            [ngModel]="state().tenantId()" (ngModelChange)="setTenant($event)" />
        </div>
      }

      <div class="ml-auto flex items-end gap-3">
        @if (showAuto()) {
          <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Auto-refresh</label>
            <select class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              [ngModel]="state().autoSeconds()" (ngModelChange)="state().autoSeconds.set(+$event)">
              @for (o of autoOptions; track o.seconds) { <option [ngValue]="o.seconds">{{ o.label }}</option> }
            </select>
          </div>
        }
        <button type="button" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" (click)="state().bump()" title="Refresh now">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5" /></svg>
          Refresh
        </button>
      </div>
    </div>
  `,
})
export class MonFilterBar {
  readonly state = input.required<FilterState>();
  readonly showTenant = input(true);
  readonly showAuto = input(true);

  readonly ranges = RANGE_OPTIONS;
  readonly autoOptions = AUTO_REFRESH_OPTIONS;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Auto-refresh timer: re-created whenever the interval changes.
    effect((onCleanup) => {
      const secs = this.state().autoSeconds();
      if (!secs) return;
      const id = setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) this.state().bump();
      }, secs * 1000);
      onCleanup(() => clearInterval(id));
    });
    destroyRef.onDestroy(() => {});
  }

  setRange(key: RangeKey): void {
    const s = this.state();
    s.range.set(key);
    if (key === 'custom') {
      if (!s.customTo()) s.customTo.set(toLocalInput(new Date()));
      if (!s.customFrom()) s.customFrom.set(toLocalInput(new Date(Date.now() - 3_600_000)));
    } else {
      s.bump();
    }
  }

  setTenant(value: number | string | null): void {
    const n = value === null || value === '' ? null : Number(value);
    this.state().tenantId.set(n && n > 0 ? n : null);
    this.state().bump();
  }
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
