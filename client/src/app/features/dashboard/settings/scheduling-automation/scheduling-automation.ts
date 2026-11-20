/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CompatibilityPolicy,
  OpenShiftAssignmentMode,
  SchedulingSettings,
} from '../../../../core/models/scheduler.model';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { Alert } from '../../../../shared/ui/alert/alert';

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Settings → Scheduling: "Scheduling automation" card (SuperAdmin only). */
@Component({
  selector: 'app-scheduling-automation',
  imports: [FormsModule, Alert],
  template: `
    <div class="wp-card mt-6">
      <h2 class="text-base font-bold text-slate-900">Scheduling automation</h2>
      <p class="mt-1 text-sm text-slate-500">
        Missed clock-in/out alerts, how open shifts are filled, shift confirmation reminders, client–caregiver
        compatibility and authorization expiry notices. The automation runs every few minutes in each client's office time.
      </p>
      <app-alert type="error" [message]="error()" />
      <app-alert type="success" [message]="notice()" />

      <h3 class="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Missed clock-in / clock-out</h3>
      <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="wp-label">Grace after the start (minutes)</label>
          <input type="number" min="0" max="240" step="5" class="wp-input" [ngModel]="graceIn()" (ngModelChange)="graceIn.set($event)" />
          <p class="mt-1 text-[11px] text-slate-400">No clock-in this long after the visit starts → missed clock-in.</p>
        </div>
        <div>
          <label class="wp-label">Grace after the end (minutes)</label>
          <input type="number" min="0" max="240" step="5" class="wp-input" [ngModel]="graceOut()" (ngModelChange)="graceOut.set($event)" />
          <p class="mt-1 text-[11px] text-slate-400">Still clocked in this long after the visit ends → missed clock-out.</p>
        </div>
      </div>
      <div class="mt-3 space-y-3">
        <label class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-700">Notify the caregiver (bell, push, SMS)</span>
          <input type="checkbox" [ngModel]="notifyCaregiver()" (ngModelChange)="notifyCaregiver.set($event)" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        </label>
        <label class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-700">Notify the office (Admins / Managers of the client's office)</span>
          <input type="checkbox" [ngModel]="notifyOffice()" (ngModelChange)="notifyOffice.set($event)" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        </label>
      </div>

      <h3 class="mt-5 border-t border-slate-100 pt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Open shifts &amp; confirmations</h3>
      <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="wp-label">Open shift assignment</label>
          <select class="wp-input" [ngModel]="mode()" (ngModelChange)="mode.set($event)">
            <option value="AdminPicks">Office picks from interested caregivers</option>
            <option value="FirstToAccept">First caregiver to accept gets it</option>
          </select>
        </div>
        <div>
          <label class="wp-label">Confirmation reminder (hours before the visit)</label>
          <input type="number" min="0" max="168" class="wp-input" [ngModel]="reminderHours()" (ngModelChange)="reminderHours.set($event)" />
          <p class="mt-1 text-[11px] text-slate-400">Reminds caregivers who have not accepted their shift yet. 0 = off.</p>
        </div>
      </div>

      <h3 class="mt-5 border-t border-slate-100 pt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Compatibility &amp; authorizations</h3>
      <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="wp-label">Client–caregiver compatibility</label>
          <select class="wp-input" [ngModel]="policy()" (ngModelChange)="policy.set($event)">
            <option value="Allow">Allow (no checks)</option>
            <option value="Warn">Warn (show the issues)</option>
            <option value="Block">Block (refuse incompatible caregivers)</option>
          </select>
          <p class="mt-1 text-[11px] text-slate-400">Blocked caregivers, missing required attributes, avoided attributes and gender preference.</p>
        </div>
        <div>
          <label class="wp-label">Authorization expiry notice (days before the end)</label>
          <input type="number" min="1" max="120" class="wp-input" [ngModel]="expiryDays()" (ngModelChange)="expiryDays.set($event)" />
          <p class="mt-1 text-[11px] text-slate-400">Notices at 7 days and on the end date are always sent too.</p>
        </div>
      </div>

      <div class="mt-5 flex justify-end">
        <button type="button" (click)="save()" [disabled]="saving()" class="wp-btn-primary">
          @if (saving()) { Saving… } @else { Save automation settings }
        </button>
      </div>
    </div>
  `,
})
export class SchedulingAutomationCard {
  private readonly scheduler = inject(SchedulerService);

  readonly graceIn = signal(15);
  readonly graceOut = signal(15);
  readonly notifyCaregiver = signal(true);
  readonly notifyOffice = signal(true);
  readonly mode = signal<OpenShiftAssignmentMode>('AdminPicks');
  readonly reminderHours = signal(24);
  readonly policy = signal<CompatibilityPolicy>('Warn');
  readonly expiryDays = signal(30);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  constructor() {
    this.scheduler.getSettings().subscribe({
      next: (s) => this.apply(s),
      error: (err: Error) => this.error.set(err.message || 'Could not load the automation settings.'),
    });
  }

  private apply(s: SchedulingSettings): void {
    this.graceIn.set(s.missedClockInGraceMinutes ?? 15);
    this.graceOut.set(s.missedClockOutGraceMinutes ?? 15);
    this.notifyCaregiver.set(s.notifyCaregiverOnMissedClock ?? true);
    this.notifyOffice.set(s.notifyOfficeOnMissedClock ?? true);
    this.mode.set(s.openShiftAssignmentMode ?? 'AdminPicks');
    this.reminderHours.set(s.confirmationReminderHours ?? 24);
    this.policy.set(s.compatibilityPolicy ?? 'Warn');
    this.expiryDays.set(s.authorizationExpiryNoticeDays ?? 30);
  }

  save(): void {
    this.saving.set(true);
    this.notice.set('');
    this.error.set('');
    this.scheduler
      .updateAutomation({
        missedClockInGraceMinutes: clamp(this.graceIn(), 0, 240, 15),
        missedClockOutGraceMinutes: clamp(this.graceOut(), 0, 240, 15),
        notifyCaregiverOnMissedClock: this.notifyCaregiver(),
        notifyOfficeOnMissedClock: this.notifyOffice(),
        openShiftAssignmentMode: this.mode(),
        confirmationReminderHours: clamp(this.reminderHours(), 0, 168, 24),
        compatibilityPolicy: this.policy(),
        authorizationExpiryNoticeDays: clamp(this.expiryDays(), 1, 120, 30),
      })
      .subscribe({
        next: (s) => {
          this.saving.set(false);
          this.apply(s);
          this.notice.set('Automation settings saved.');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message || 'Could not save the automation settings.');
        },
      });
  }
}
