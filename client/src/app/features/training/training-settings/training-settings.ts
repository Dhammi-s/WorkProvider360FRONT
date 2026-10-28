/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrainingSettings } from '../../../core/models/training.model';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Super Admin: reminder emails and the default due date for new assignments. */
@Component({
  selector: 'app-training-settings',
  imports: [FormsModule, DatePipe, Alert],
  template: `
    <section class="max-w-2xl space-y-6">
      <div class="wp-anim-up">
        <h1 class="text-3xl font-black tracking-tight text-portal-900">Training settings</h1>
        <p class="mt-1 text-sm text-slate-500">Reminder emails and defaults for this agency.</p>
      </div>
      <app-alert type="error" [message]="error()" />
      <app-alert type="success" [message]="success()" />
      @if (s(); as v) {
        <div class="wp-pcard space-y-5">
          <label class="flex cursor-pointer items-start gap-3">
            <input type="checkbox" class="mt-1 h-4 w-4 text-portal-600" [ngModel]="v.remindersEnabled" (ngModelChange)="s.set({ ...v, remindersEnabled: $event })" />
            <span><span class="block text-sm font-bold text-slate-800">Daily reminder emails</span>
              <span class="text-xs text-slate-500">"Today is the last date" emails to trainees whose training is due today.</span></span>
          </label>
          <label class="flex cursor-pointer items-start gap-3">
            <input type="checkbox" class="mt-1 h-4 w-4 text-portal-600" [ngModel]="v.overdueEmailsEnabled" (ngModelChange)="s.set({ ...v, overdueEmailsEnabled: $event })" />
            <span><span class="block text-sm font-bold text-slate-800">Not-completed emails</span>
              <span class="text-xs text-slate-500">When a training passes its due date unfinished, email the trainee and the person who assigned it.</span></span>
          </label>
          <div class="max-w-xs">
            <label class="wp-label">Default due date (days after assigning)</label>
            <input type="number" min="1" max="365" class="wp-input wp-input-portal" [ngModel]="v.defaultDueDays" (ngModelChange)="s.set({ ...v, defaultDueDays: +$event })" />
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 pt-4">
            <span class="text-xs text-slate-400">Last reminder run: {{ v.lastReminderRunDate ? (v.lastReminderRunDate | date: 'MMM d, y') : 'not yet' }}</span>
            <button type="button" class="wp-btn-portal" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save settings' }}</button>
          </div>
        </div>
      }
    </section>
  `,
})
export class TrainingSettingsPage {
  private readonly training = inject(TrainingService);
  readonly s = signal<TrainingSettings | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  constructor() {
    this.training.settings().subscribe({ next: (v) => this.s.set(v), error: (e: Error) => this.error.set(e.message) });
  }

  save(): void {
    const v = this.s();
    if (!v) return;
    this.saving.set(true);
    this.error.set('');
    this.training
      .saveSettings({ remindersEnabled: v.remindersEnabled, overdueEmailsEnabled: v.overdueEmailsEnabled, defaultDueDays: v.defaultDueDays })
      .subscribe({
        next: (saved) => {
          this.s.set(saved);
          this.saving.set(false);
          this.success.set('Settings saved.');
        },
        error: (e: Error) => {
          this.saving.set(false);
          this.error.set(e.message);
        },
      });
  }
}
