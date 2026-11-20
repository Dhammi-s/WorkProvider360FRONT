/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DecimalPipe } from '@angular/common';
import { Component, HostListener, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CaregiverSuggestion, SuggestionRequest, wallRange } from '../../../core/models/scheduler.model';
import { SchedulerService } from '../../../core/services/scheduler.service';

/**
 * Right-side drawer: caregivers ranked for a proposed visit (score badge, factor bars with
 * reasons, distance, warnings) and an "Excluded" section with the reasons. Emits the pick.
 */
@Component({
  selector: 'app-caregiver-suggestions',
  imports: [DecimalPipe],
  template: `
    <div class="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/40" (click)="closed.emit()"></div>
      <div class="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Suggested caregivers</p>
            <h2 class="mt-0.5 text-base font-bold text-slate-900">{{ range() }}</h2>
          </div>
          <button type="button" (click)="closed.emit()" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 6.3a1 1 0 011.4 0L10 8.6l2.3-2.3a1 1 0 111.4 1.4L11.4 10l2.3 2.3a1 1 0 01-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 01-1.4-1.4L8.6 10 6.3 7.7a1 1 0 010-1.4z" /></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          @if (loading()) {
            <p class="py-10 text-center text-sm text-slate-400">Ranking caregivers…</p>
          } @else if (error()) {
            <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
          } @else {
            @if (!ranked().length) {
              <p class="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No caregiver is eligible for this visit.</p>
            }
            <ul class="space-y-3">
              @for (s of ranked(); track s.userId) {
                <li class="rounded-xl border p-3 transition hover:border-brand-300 hover:shadow-sm"
                  [class]="s.userId === currentUserId() ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'">
                  <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold" [class]="scoreClass(s.score)">{{ s.score }}</span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-semibold text-slate-900">{{ s.fullName }}</p>
                      <p class="text-xs text-slate-500">
                        @if (s.distanceKm != null) { {{ s.distanceKm | number: '1.0-1' }} km away } @else { Distance unknown }
                      </p>
                    </div>
                    <button type="button" (click)="picked.emit({ userId: s.userId, fullName: s.fullName })" class="wp-btn-primary !py-1.5 !px-3 text-xs">
                      {{ s.userId === currentUserId() ? 'Keep' : 'Assign' }}
                    </button>
                  </div>
                  <button type="button" (click)="toggle(s.userId)" class="mt-2 text-xs font-semibold text-brand-700">
                    {{ open().has(s.userId) ? 'Hide details' : 'Why this score?' }}
                  </button>
                  @if (open().has(s.userId)) {
                    <ul class="mt-2 space-y-1.5">
                      @for (f of s.factors; track f.name) {
                        <li>
                          <div class="flex items-baseline justify-between text-xs">
                            <span class="font-semibold text-slate-700">{{ f.name }}</span>
                            <span class="text-slate-500">{{ f.points }} / {{ f.max }}</span>
                          </div>
                          <div class="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div class="h-full rounded-full" [class]="barClass(f.points, f.max)" [style.width.%]="f.max ? (f.points * 100) / f.max : 0"></div>
                          </div>
                          @if (f.reason) { <p class="mt-0.5 text-[11px] text-slate-400">{{ f.reason }}</p> }
                        </li>
                      }
                    </ul>
                  }
                  @for (w of s.warnings; track $index) {
                    <p class="mt-1.5 flex gap-1.5 text-xs text-amber-700">
                      <svg class="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.26 3.1c.77-1.33 2.7-1.33 3.47 0l6.28 10.9c.77 1.33-.2 3-1.73 3H3.72c-1.54 0-2.5-1.67-1.74-3L8.26 3.1zM10 7a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
                      <span>{{ w }}</span>
                    </p>
                  }
                </li>
              }
            </ul>

            @if (excluded().length) {
              <h3 class="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Excluded ({{ excluded().length }})</h3>
              <ul class="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                @for (s of excluded(); track s.userId) {
                  <li class="px-3 py-2 text-sm">
                    <p class="font-semibold text-slate-600">{{ s.fullName }}</p>
                    @for (r of s.excludedReasons; track $index) { <p class="text-xs text-slate-500">{{ r }}</p> }
                  </li>
                }
              </ul>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class CaregiverSuggestions {
  private readonly service = inject(SchedulerService);

  readonly request = input.required<SuggestionRequest>();
  /** The caregiver currently in the form (highlighted). */
  readonly currentUserId = input<number | null>(null);
  readonly picked = output<{ userId: number; fullName: string }>();
  readonly closed = output<void>();

  readonly items = signal<CaregiverSuggestion[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly open = signal<Set<number>>(new Set());

  readonly ranked = computed(() => this.items().filter((s) => !s.excluded));
  readonly excluded = computed(() => this.items().filter((s) => s.excluded));
  readonly range = computed(() => wallRange(this.request().startUtc, this.request().endUtc));

  constructor() {
    effect(() => {
      const req = this.request();
      untracked(() => this.load(req));
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  private load(req: SuggestionRequest): void {
    this.loading.set(true);
    this.error.set('');
    this.service.suggestions(req).subscribe({
      next: (list) => {
        this.items.set(list);
        // Show the reasons of the best match straight away.
        const best = list.find((s) => !s.excluded);
        this.open.set(new Set(best ? [best.userId] : []));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load suggestions.');
        this.loading.set(false);
      },
    });
  }

  toggle(userId: number): void {
    this.open.update((set) => {
      const next = new Set(set);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  scoreClass(score: number): string {
    if (score >= 75) return 'bg-emerald-600 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-slate-400 text-white';
  }

  barClass(points: number, max: number): string {
    const p = max ? points / max : 0;
    if (p >= 0.75) return 'bg-emerald-500';
    if (p >= 0.4) return 'bg-amber-500';
    return 'bg-slate-400';
  }
}
