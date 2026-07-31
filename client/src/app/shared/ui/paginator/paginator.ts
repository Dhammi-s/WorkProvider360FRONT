/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Client-side pager: "Showing X–Y of N items" + page-size dropdown + page buttons. */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-3 text-sm sm:flex-row">
        <p class="text-slate-500">
          Showing <span class="font-semibold text-slate-700">{{ from() }}</span>–<span class="font-semibold text-slate-700">{{ to() }}</span>
          of <span class="font-semibold text-slate-700">{{ total() }}</span> items
        </p>

        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-slate-500">
            Show
            <select class="wp-input !w-auto !py-1.5 text-sm" [value]="pageSize()" (change)="onSize($event)">
              @for (opt of pageSizeOptions(); track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
          </label>

          @if (totalPages() > 1) {
            <div class="flex items-center gap-1">
              <button type="button" (click)="go(page() - 1)" [disabled]="page() === 1"
                class="rounded-lg px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent">‹</button>
              @for (p of pages(); track p) {
                <button type="button" (click)="go(p)"
                  class="min-w-[34px] rounded-lg px-2.5 py-1.5 font-semibold"
                  [class]="p === page() ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'">{{ p }}</button>
              }
              <button type="button" (click)="go(page() + 1)" [disabled]="page() === totalPages()"
                class="rounded-lg px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent">›</button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class Paginator {
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input(10);
  readonly pageSizeOptions = input<number[]>([10, 20, 30, 40, 50, 100]);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  /** A compact window of page numbers around the current page. */
  readonly pages = computed(() => {
    const tp = this.totalPages();
    const cur = this.page();
    const start = Math.max(1, cur - 2);
    const end = Math.min(tp, cur + 2);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  go(p: number): void {
    const clamped = Math.min(Math.max(1, p), this.totalPages());
    if (clamped !== this.page()) this.pageChange.emit(clamped);
  }

  onSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (value > 0) this.pageSizeChange.emit(value);
  }
}
