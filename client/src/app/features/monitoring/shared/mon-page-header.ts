/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, input } from '@angular/core';

/** Title + subtitle row; action buttons are projected to the right. */
@Component({
  selector: 'mon-page-header',
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">{{ title() }}</h1>
        @if (subtitle()) { <p class="mt-0.5 text-sm text-slate-500">{{ subtitle() }}</p> }
      </div>
      <div class="flex items-center gap-2"><ng-content /></div>
    </div>
  `,
})
export class MonPageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
