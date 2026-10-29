/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-29
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, input, output, signal } from '@angular/core';

/**
 * 1-5 star rating. Read-only by default (shows `value`, rounded to the nearest
 * half for averages); with `editable` the stars are buttons that emit `changed`.
 */
@Component({
  selector: 'app-star-rating',
  template: `
    <span class="inline-flex items-center gap-0.5" [attr.aria-label]="(value() || 0) + ' out of 5 stars'" role="img">
      @for (n of stars; track n) {
        @if (editable()) {
          <button type="button" class="leading-none transition hover:scale-110" [attr.aria-label]="n + ' stars'"
            (mouseenter)="hover.set(n)" (mouseleave)="hover.set(0)" (click)="changed.emit(n)">
            <svg [class]="sizeClass()" viewBox="0 0 20 20" [attr.fill]="fillFor(n)"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" /></svg>
          </button>
        } @else {
          <svg [class]="sizeClass()" viewBox="0 0 20 20" [attr.fill]="fillFor(n)">
            @if (isHalf(n)) {
              <defs><linearGradient [attr.id]="gradId"><stop offset="50%" stop-color="#f59e0b" /><stop offset="50%" stop-color="#e2e8f0" /></linearGradient></defs>
            }
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        }
      }
    </span>
  `,
})
export class StarRating {
  private static nextId = 0;

  readonly value = input<number | null | undefined>(0);
  readonly editable = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('sm');
  readonly changed = output<number>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly hover = signal(0);
  readonly gradId = `wp-star-half-${StarRating.nextId++}`;

  readonly sizeClass = computed(() => ({ sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' })[this.size()]);

  /** Nearest half star, e.g. 3.6 -> 3.5. */
  private readonly shown = computed(() => this.hover() || Math.round((this.value() ?? 0) * 2) / 2);

  isHalf(n: number): boolean {
    return !this.editable() && this.shown() === n - 0.5;
  }

  fillFor(n: number): string {
    const v = this.shown();
    if (v >= n) return '#f59e0b';
    if (this.isHalf(n)) return `url(#${this.gradId})`;
    return '#e2e8f0';
  }
}
