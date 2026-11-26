/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendingConfirmation, wallRange } from '../../../../core/models/scheduler.model';
import { VisitException, exceptionTypeLabel } from '../../../../core/models/visit-exception.model';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VisitExceptionService } from '../../../../core/services/visit-exception.service';

/**
 * Overview cards for managers: shifts not confirmed by their caregiver yet (Send reminder)
 * and open missed clock-ins (link to the page). Hidden without scheduling Write access.
 */
@Component({
  selector: 'app-scheduling-alerts',
  imports: [RouterLink],
  template: `
    @if (visible()) {
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Pending confirmation -->
        <div class="wp-card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-slate-900">Pending confirmation</h2>
              <p class="text-xs text-slate-500">Shifts in the next 7 days the caregiver has not accepted yet</p>
            </div>
            <span class="text-3xl font-extrabold tracking-tight" [class]="pending().length ? 'text-amber-600' : 'text-slate-300'">{{ pending().length }}</span>
          </div>
          @if (pending().length) {
            <ul class="mt-3 divide-y divide-slate-100">
              @for (p of pending().slice(0, 5); track p.scheduleId) {
                <li class="flex items-center justify-between gap-3 py-2 text-sm">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-slate-800">{{ p.caregiverName }}</p>
                    <p class="truncate text-xs text-slate-500">{{ range(p.startUtc, p.endUtc) }}{{ p.clientName ? ' · ' + p.clientName : '' }}</p>
                  </div>
                  @if (p.confirmationReminderSentOn) {
                    <span class="shrink-0 text-[11px] text-slate-400">Reminded</span>
                  } @else {
                    <button type="button" (click)="remind([p.scheduleId])" [disabled]="busy()" class="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-800">Remind</button>
                  }
                </li>
              }
            </ul>
            <div class="mt-3 flex items-center justify-between">
              <a routerLink="/dashboard/scheduler" class="wp-link text-sm">Open scheduler</a>
              <button type="button" (click)="remindAll()" [disabled]="busy()" class="wp-btn-primary !py-1.5 !px-3 text-xs">Send reminder to all</button>
            </div>
          } @else {
            <p class="mt-3 text-sm text-slate-400">{{ loaded() ? 'Every upcoming shift is confirmed.' : 'Loading…' }}</p>
          }
        </div>

        <!-- Missed clock-ins -->
        <div class="wp-card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-slate-900">Missed clock-ins</h2>
              <p class="text-xs text-slate-500">Open missed clock-ins and clock-outs</p>
            </div>
            <span class="text-3xl font-extrabold tracking-tight" [class]="missedTotal() ? 'text-red-600' : 'text-slate-300'">{{ missedTotal() }}</span>
          </div>
          @if (missed().length) {
            <ul class="mt-3 divide-y divide-slate-100">
              @for (e of missed(); track e.exceptionId) {
                <li class="py-2 text-sm">
                  <p class="truncate font-semibold text-slate-800">{{ e.caregiverName || '—' }} <span class="font-normal text-slate-500">· {{ typeLabel(e.exceptionType) }}</span></p>
                  <p class="truncate text-xs text-slate-500">{{ range(e.startUtc, e.endUtc) }}{{ e.clientName ? ' · ' + e.clientName : '' }}</p>
                </li>
              }
            </ul>
          } @else {
            <p class="mt-3 text-sm text-slate-400">{{ loaded() ? 'No open missed clock-ins.' : 'Loading…' }}</p>
          }
          <div class="mt-3">
            <a routerLink="/dashboard/visit-exceptions" class="wp-link text-sm">Review missed clock-ins</a>
          </div>
        </div>
      </div>
    }
  `,
})
export class SchedulingAlerts {
  private readonly scheduler = inject(SchedulerService);
  private readonly exceptions = inject(VisitExceptionService);
  private readonly toast = inject(ToastService);

  readonly visible = signal(false);
  readonly loaded = signal(false);
  readonly pending = signal<PendingConfirmation[]>([]);
  readonly missed = signal<VisitException[]>([]);
  readonly missedTotal = signal(0);
  readonly busy = signal(false);

  readonly range = wallRange;
  readonly typeLabel = exceptionTypeLabel;

  constructor() {
    this.scheduler.getAccess().subscribe({
      next: (a) => {
        if (!a.canManage) return;
        this.visible.set(true);
        this.load();
      },
      error: () => {},
    });
  }

  private load(): void {
    let done = 0;
    const finish = () => {
      if (++done === 2) this.loaded.set(true);
    };
    this.scheduler.pendingConfirmation(7).subscribe({
      next: (p) => {
        this.pending.set(p);
        finish();
      },
      error: () => finish(),
    });
    this.exceptions.list({ status: 'Open', page: 1, pageSize: 5 }).subscribe({
      next: (r) => {
        this.missed.set(r.items);
        this.missedTotal.set(r.total);
        finish();
      },
      error: () => finish(),
    });
  }

  remindAll(): void {
    this.remind(this.pending().map((p) => p.scheduleId).slice(0, 200));
  }

  remind(ids: number[]): void {
    if (!ids.length) return;
    this.busy.set(true);
    this.scheduler.remind(ids).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.success(
          `Reminder sent to ${r.sent} caregiver${r.sent === 1 ? '' : 's'}${r.skipped.length ? ` (${r.skipped.length} skipped)` : ''}.`,
        );
        this.scheduler.pendingConfirmation(7).subscribe({ next: (p) => this.pending.set(p), error: () => {} });
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not send the reminders.');
      },
    });
  }
}
