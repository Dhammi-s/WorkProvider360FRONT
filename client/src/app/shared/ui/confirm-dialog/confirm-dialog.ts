/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, input, output } from '@angular/core';

/**
 * Modal popup with up to three choices: a primary action, an optional second
 * action and Cancel. Render it inside an @if; it emits which button was used.
 * Used for the "unapproved schedules" warning on every invoicing screen.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/50" (click)="cancelled.emit()"></div>
      <div class="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            [class]="tone() === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.26 3.1c.77-1.33 2.7-1.33 3.47 0l6.28 10.9c.77 1.33-.2 3-1.73 3H3.72c-1.54 0-2.5-1.67-1.74-3L8.26 3.1zM10 7a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
          </span>
          <div class="min-w-0">
            <h2 class="text-base font-bold text-slate-900">{{ title() }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ message() }}</p>
            @if (details().length) {
              <ul class="mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
                @for (d of details(); track $index) {
                  <li>{{ d }}</li>
                }
              </ul>
            }
          </div>
        </div>
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" (click)="cancelled.emit()" class="wp-btn-ghost">{{ cancelLabel() }}</button>
          @if (altLabel()) {
            <button type="button" (click)="alt.emit()" class="wp-btn-ghost !text-brand-700 ring-1 ring-inset ring-brand-200">{{ altLabel() }}</button>
          }
          @if (confirmLabel()) {
            <button type="button" (click)="confirmed.emit()"
              [class]="tone() === 'danger' ? 'wp-btn-primary !bg-red-600 hover:!bg-red-700' : 'wp-btn-primary'">{{ confirmLabel() }}</button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly details = input<string[]>([]);
  /** Primary action; null hides it (e.g. when the action is not allowed). */
  readonly confirmLabel = input<string | null>('Continue');
  /** Optional second action, e.g. "Approved only". */
  readonly altLabel = input<string | null>(null);
  readonly cancelLabel = input<string>('Cancel');
  readonly tone = input<'warning' | 'danger'>('warning');

  readonly confirmed = output<void>();
  readonly alt = output<void>();
  readonly cancelled = output<void>();
}
