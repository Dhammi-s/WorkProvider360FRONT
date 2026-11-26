/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shown when the user lacks the permission for a page (or has no permissions at all). */
@Component({
  selector: 'app-monitoring-no-access',
  imports: [RouterLink],
  template: `
    <div class="mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border border-slate-100 bg-white px-8 py-12 text-center shadow-card">
      <span class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 118 0v4" /></svg>
      </span>
      <h1 class="text-xl font-extrabold text-slate-900">No access</h1>
      <p class="mt-2 text-sm text-slate-500">Your monitoring account does not have permission to view this page. Contact a SuperAdmin to request access.</p>
      <a routerLink="/monitoring" class="wp-btn-ghost mt-6">Back to monitoring</a>
    </div>
  `,
})
export class MonitoringNoAccess {}
