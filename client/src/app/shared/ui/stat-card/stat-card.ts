/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, input } from '@angular/core';

/** Compact KPI tile used across the dashboards. */
@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly delta = input<string>('');
  readonly icon = input<string>(''); // inline SVG path data
  readonly tone = input<'brand' | 'accent' | 'amber' | 'slate'>('brand');

  get iconWrap(): string {
    switch (this.tone()) {
      case 'accent':
        return 'bg-accent-500/10 text-accent-600';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600';
      case 'slate':
        return 'bg-slate-500/10 text-slate-600';
      default:
        return 'bg-brand-500/10 text-brand-600';
    }
  }
}
