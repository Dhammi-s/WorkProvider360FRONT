/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, input, output } from '@angular/core';

/** Compact "page X of Y" pager. */
@Component({
  selector: 'mon-pager',
  template: `
    @if (total() > 0) {
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
        <span>{{ from() }}–{{ to() }} of {{ total().toLocaleString() }}</span>
        <div class="flex items-center gap-2">
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">Previous</button>
          <span class="tabular-nums">Page {{ page() }} / {{ pages() }}</span>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40" [disabled]="page() >= pages()" (click)="pageChange.emit(page() + 1)">Next</button>
        </div>
      </div>
    }
  `,
})
export class MonPager {
  readonly page = input(1);
  readonly pageSize = input(25);
  readonly total = input(0);
  readonly pageChange = output<number>();

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));
}
