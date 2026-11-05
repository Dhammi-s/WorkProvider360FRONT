/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, input, output } from '@angular/core';
import { MonitoringApiError } from '../services/monitoring-api.service';

/** Wraps page content with loading / empty / error (incl. 403 "no access") states. */
@Component({
  selector: 'mon-state',
  template: `
    @if (isForbidden()) {
      <div class="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center shadow-card">
        <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 118 0v4" /></svg>
        </span>
        <p class="text-base font-semibold text-slate-800">You do not have access to this data</p>
        <p class="mt-1 max-w-sm text-sm text-slate-500">Your monitoring role does not include this permission. Ask a SuperAdmin if you need it.</p>
      </div>
    } @else if (errorMessage()) {
      <div class="flex flex-col items-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-12 text-center">
        <p class="text-base font-semibold text-red-700">Could not load data</p>
        <p class="mt-1 max-w-md text-sm text-red-600">{{ errorMessage() }}</p>
        <button type="button" class="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50" (click)="retry.emit()">Try again</button>
      </div>
    } @else if (loading() && empty()) {
      <div class="flex items-center justify-center py-20" role="status" aria-label="Loading">
        <span class="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"></span>
      </div>
    } @else if (empty()) {
      <div class="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
        <p class="text-base font-semibold text-slate-700">{{ emptyTitle() }}</p>
        <p class="mt-1 text-sm text-slate-400">{{ emptyHint() }}</p>
      </div>
    } @else {
      <div [class.opacity-60]="loading()" class="transition-opacity">
        <ng-content />
      </div>
    }
  `,
})
export class MonState {
  readonly loading = input(false);
  readonly error = input<MonitoringApiError | string | null>(null);
  readonly empty = input(false);
  readonly emptyTitle = input('No data for this period');
  readonly emptyHint = input('Try widening the time range or clearing filters.');
  readonly retry = output<void>();

  readonly isForbidden = computed(() => {
    const e = this.error();
    return !!e && typeof e !== 'string' && e.status === 403;
  });
  readonly errorMessage = computed(() => {
    const e = this.error();
    return !e ? '' : typeof e === 'string' ? e : e.message;
  });
}
