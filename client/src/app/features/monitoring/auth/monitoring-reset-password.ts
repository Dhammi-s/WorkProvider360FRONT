/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringAuthService } from './monitoring-auth.service';

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const a = group.get('newPassword')?.value;
  const b = group.get('confirm')?.value;
  return a && b && a !== b ? { mismatch: true } : null;
}

/** Anonymous reset using the one-time token issued by a SuperAdmin. */
@Component({
  selector: 'app-monitoring-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div class="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-card">
        <h1 class="text-xl font-extrabold text-slate-900">Reset monitoring password</h1>
        <p class="mt-1 text-sm text-slate-500">Enter your email, the reset token you were given and a new password.</p>
        @if (error()) {
          <div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{{ error() }}</div>
        }
        @if (done()) {
          <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Password reset. <a routerLink="/monitoring/login" class="wp-link">Sign in</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5 space-y-4" novalidate>
            <div>
              <label class="wp-label">Email</label>
              <input type="email" formControlName="email" class="wp-input" autocomplete="username" />
            </div>
            <div>
              <label class="wp-label">Reset token</label>
              <input type="text" formControlName="token" class="wp-input font-mono" autocomplete="off" />
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
            <button type="submit" class="wp-btn-primary w-full" [disabled]="loading()">{{ loading() ? 'Resetting…' : 'Reset password' }}</button>
          </form>
        }
        <p class="mt-6 text-center text-xs"><a routerLink="/monitoring/login" class="wp-link">Back to sign in</a></p>
      </div>
    </div>
  `,
})
export class MonitoringResetPassword {
  private readonly auth = inject(MonitoringAuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly done = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
      token: [this.route.snapshot.queryParamMap.get('token') ?? '', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(12)]],
      confirm: ['', Validators.required],
    },
    { validators: matchPasswords },
  );

  constructor() {
    // Do not leave the one-time token in the address bar / history.
    if (this.route.snapshot.queryParamMap.has('token')) {
      this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: {} });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, token, newPassword } = this.form.getRawValue();
    this.auth.resetPassword(email.trim(), token.trim(), newPassword).subscribe({
      next: () => {
        this.done.set(true);
        this.loading.set(false);
      },
      error: (err: MonitoringApiError) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
