/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringAuthService } from './monitoring-auth.service';

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const a = group.get('newPassword')?.value;
  const b = group.get('confirm')?.value;
  return a && b && a !== b ? { mismatch: true } : null;
}

/** Forced (or voluntary) password change for the signed-in monitoring user. */
@Component({
  selector: 'app-monitoring-change-password',
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div class="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-card">
        <h1 class="text-xl font-extrabold text-slate-900">Change your password</h1>
        <p class="mt-1 text-sm text-slate-500">
          @if (auth.mustChangePassword()) { You must choose a new password before continuing. } @else { Choose a strong new password. }
        </p>
        @if (error()) {
          <div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{{ error() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5 space-y-4" novalidate>
          <div>
            <label class="wp-label">Current password</label>
            <input type="password" formControlName="currentPassword" class="wp-input" autocomplete="current-password" />
          </div>
          <div>
            <label class="wp-label">New password</label>
            <input type="password" formControlName="newPassword" class="wp-input" autocomplete="new-password" />
            <p class="mt-1 text-xs text-slate-400">At least 12 characters, with upper and lower case letters, a number and a symbol.</p>
          </div>
          <div>
            <label class="wp-label">Confirm new password</label>
            <input type="password" formControlName="confirm" class="wp-input" autocomplete="new-password" />
            @if (form.touched && form.hasError('mismatch')) {
              <p class="mt-1 text-xs font-medium text-red-600">Passwords do not match.</p>
            }
          </div>
          <div class="flex gap-3">
            <button type="submit" class="wp-btn-primary flex-1" [disabled]="loading()">{{ loading() ? 'Saving…' : 'Update password' }}</button>
            <button type="button" class="wp-btn-ghost" (click)="cancel()">{{ auth.mustChangePassword() ? 'Sign out' : 'Cancel' }}</button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class MonitoringChangePassword {
  readonly auth = inject(MonitoringAuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(12)]],
      confirm: ['', Validators.required],
    },
    { validators: matchPasswords },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        // Existing sessions may be revoked server-side: sign in again with the new password.
        this.auth.logout().subscribe(() => this.router.navigate(['/monitoring/login'], { queryParams: { changed: 1 } }));
      },
      error: (err: MonitoringApiError) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  cancel(): void {
    if (this.auth.mustChangePassword()) {
      this.auth.logout().subscribe(() => this.router.navigate(['/monitoring/login']));
    } else {
      this.router.navigate(['/monitoring']);
    }
  }
}
