/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TrainingAccess, TrainingAccessResult } from '../../../core/models/training.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

/**
 * "Training portal" card on a staff profile: shows whether the portal is
 * enabled and, for people allowed to (SuperAdmin: anyone; Admin: Managers and
 * Users; Manager: Users), the Enable toggle and Reset password. Super Admins
 * also see the training username and a new password once after a reset.
 */
@Component({
  selector: 'app-training-access-card',
  imports: [DatePipe],
  template: `
    <div class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
            🎓 Training portal
            @if (access(); as a) {
              <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" [class]="a.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ a.enabled ? 'Enabled' : 'Off' }}
              </span>
              @if (a.needsPasswordReset) { <span class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">Blocked</span> }
            }
          </div>
          @if (access(); as a) {
            <div class="mt-1 text-xs text-slate-500">
              @if (a.enabled) {
                @if (a.username) { Username <span class="font-mono font-semibold text-slate-700">{{ a.username }}</span> · }
                {{ a.enabledByName ? 'enabled by ' + a.enabledByName : 'enabled' }}{{ a.enabledOn ? ' on ' + (a.enabledOn | date: 'MMM d, y') : '' }}
                · last sign-in {{ a.lastLoginOn ? (a.lastLoginOn | date: 'MMM d') : 'never' }}
              } @else {
                This person cannot sign in to the training portal.
              }
            </div>
          } @else if (loading()) {
            <div class="mt-1 text-xs text-slate-400">Loading…</div>
          }
        </div>
        @if (access()?.canManage) {
          <label class="relative inline-flex shrink-0 cursor-pointer items-center" [title]="access()?.enabled ? 'Disable training portal' : 'Enable training portal'">
            <input type="checkbox" class="peer sr-only" [checked]="access()?.enabled" [disabled]="busy()" (change)="toggle()" />
            <span class="h-6 w-11 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-brand-600 peer-checked:after:translate-x-5"></span>
          </label>
        }
      </div>

      @if (access()?.canManage && access()?.enabled) {
        <div class="mt-3 flex justify-end">
          <button type="button" class="text-xs font-semibold text-brand-600 hover:underline" [disabled]="busy()" (click)="reset()">Reset training password</button>
        </div>
      }
      @if (revealed(); as c) {
        <div class="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          <div class="font-bold">Shown once. Copy it now:</div>
          <div>Username <span class="font-mono font-bold">{{ c.username }}</span> · Password <span class="font-mono font-bold">{{ c.password }}</span></div>
        </div>
      }
      @if (message()) { <div class="mt-2 text-xs" [class]="isError() ? 'text-red-600' : 'text-emerald-700'">{{ message() }}</div> }
    </div>
  `,
})
export class TrainingAccessCard {
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);

  readonly userId = input.required<number>();
  /** Emits the new enabled state so the parent can refresh its own copy. */
  readonly changed = output<boolean>();

  readonly access = signal<TrainingAccess | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  readonly revealed = signal<{ username: string; password: string } | null>(null);
  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  constructor() {
    effect(() => {
      const id = this.userId();
      this.revealed.set(null);
      this.message.set('');
      this.loading.set(true);
      this.users.getTrainingAccess(id).subscribe({
        next: (a) => {
          this.access.set(a);
          this.loading.set(false);
        },
        error: () => {
          this.access.set(null);
          this.loading.set(false);
        },
      });
    });
  }

  toggle(): void {
    const a = this.access();
    if (a) this.apply(this.users.setTrainingAccess(a.userId, { enabled: !a.enabled }));
  }

  reset(): void {
    const a = this.access();
    if (a) this.apply(this.users.resetTrainingPassword(a.userId));
  }

  private apply(call: import('rxjs').Observable<{ message?: string | null; data?: TrainingAccessResult | null }>): void {
    this.busy.set(true);
    this.message.set('');
    call.subscribe({
      next: (r) => {
        this.busy.set(false);
        if (r.data) {
          this.access.set(r.data.access);
          this.changed.emit(r.data.access.enabled);
          if (r.data.generatedPassword) {
            this.revealed.set({ username: r.data.access.username ?? '', password: r.data.generatedPassword });
          }
        }
        this.isError.set(false);
        this.message.set(r.message ?? 'Saved.');
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.isError.set(true);
        this.message.set(e.message);
      },
    });
  }
}
