/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-29
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, computed, inject } from '@angular/core';
import { TenantStatusService } from '../../core/services/tenant-status.service';

/**
 * Full-screen page while the agency is in maintenance mode (master DB
 * Agencies.IsMaintenanceMode = 1), e.g. during a production deployment. It
 * re-checks every 30 seconds and reloads the app when maintenance is over.
 */
@Component({
  selector: 'app-maintenance-page',
  template: `
    <div class="flex min-h-screen items-center justify-center bg-brand-panel px-6 py-12">
      <div class="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10 wp-anim-pop">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <svg class="h-8 w-8 animate-[spin_6s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-2.82-1.17l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 003 15.4H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 0010.4 4.6V3a2 2 0 114 0v.09a1.65 1.65 0 002.82 1.17l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0021 10.4h.09a2 2 0 110 4H21a1.65 1.65 0 00-1.6.6z" />
          </svg>
        </span>
        <span class="mt-6 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span> Maintenance mode is on
        </span>
        <h1 class="mt-4 text-2xl font-black tracking-tight text-slate-900">We'll be back shortly</h1>
        <p class="mt-3 text-sm leading-relaxed text-slate-600">
          {{ who() }} is being updated right now, so the app is unavailable for a few minutes.
          Your data is safe, and this page will reload by itself as soon as we're done.
        </p>

        <button type="button" (click)="retry()" class="wp-btn-primary mx-auto mt-7 inline-flex">Check again</button>
        <div class="mt-4 text-sm text-slate-500">
          Need help? Contact the WorkProvider360 team at
          <a [href]="'mailto:' + status.supportEmail()" class="wp-link">{{ status.supportEmail() }}</a>
        </div>
        <p class="mt-8 text-[11px] text-slate-400">Powered by WorkProvider360</p>
      </div>
    </div>
  `,
})
export class MaintenancePage {
  readonly status = inject(TenantStatusService);
  readonly who = computed(() => this.status.agencyName() || 'WorkProvider360');

  constructor() {
    // Re-check every 30 s (the API caches the flag for 30 s too).
    const timer = setInterval(() => this.recheck(), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private recheck(): void {
    this.status.load();
  }

  retry(): void {
    this.status.load();
  }
}
