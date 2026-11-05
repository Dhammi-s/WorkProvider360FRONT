/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, input } from '@angular/core';

/** Headline metric tile. */
@Component({
  selector: 'mon-kpi',
  template: `
    <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ label() }}</p>
        <span class="h-2 w-2 rounded-full" [class]="dot()"></span>
      </div>
      <p class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{{ value() }}</p>
      @if (hint()) { <p class="mt-1 text-xs text-slate-400">{{ hint() }}</p> }
    </div>
  `,
})
export class MonKpi {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  /** Tailwind bg class for the status dot. */
  readonly dot = input('bg-brand-500');
}
