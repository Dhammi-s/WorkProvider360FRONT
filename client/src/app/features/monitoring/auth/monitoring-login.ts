/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MonitoringApiError } from '../services/monitoring-api.service';
import { MonitoringAuthService } from './monitoring-auth.service';

/** Sign-in for the Development Monitoring area (separate from the main app login). */
@Component({
  selector: 'app-monitoring-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="grid min-h-screen lg:grid-cols-2">
      <div class="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div class="pointer-events-none absolute -right-20 top-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"></div>
        <div class="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl"></div>
        <div class="relative flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
          </span>
          <span class="text-lg font-bold">WorkProvider<span class="text-accent-400">360</span></span>
        </div>
        <div class="relative">
          <h1 class="text-4xl font-extrabold leading-tight">Development <span class="text-brand-300">Monitoring</span></h1>
          <p class="mt-4 max-w-md text-white/70">
            Platform-wide API performance, application logs, error tracking and tenant health in one place.
            Restricted to authorised engineering and support staff.
          </p>
          <div class="mt-8 grid grid-cols-3 gap-4 text-sm">
            <div><div class="text-xl font-extrabold">API</div><div class="text-xs text-white/60">Latency &amp; errors</div></div>
            <div><div class="text-xl font-extrabold">Logs</div><div class="text-xs text-white/60">Correlated events</div></div>
            <div><div class="text-xl font-extrabold">Tenants</div><div class="text-xs text-white/60">Per-agency health</div></div>
          </div>
        </div>
        <p class="relative text-xs text-white/40">Access is logged and audited.</p>
      </div>

      <div class="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div class="w-full max-w-sm">
          <h2 class="text-2xl font-extrabold tracking-tight text-slate-900">Monitoring sign in</h2>
          <p class="mt-1 text-sm text-slate-500">Use your developer monitoring account. This is separate from your agency login.</p>

          @if (notice()) {
            <div class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ notice() }}</div>
          }
          @if (error()) {
            <div class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-4" novalidate>
            <div>
              <label class="wp-label" for="mon-email">Email</label>
              <input id="mon-email" type="email" formControlName="email" class="wp-input" placeholder="you@company.com" autocomplete="username" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="mt-1 text-xs font-medium text-red-600">Enter a valid email address.</p>
              }
            </div>
            <div>
              <label class="wp-label" for="mon-password">Password</label>
              <div class="relative">
                <input id="mon-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" class="wp-input pr-14" placeholder="••••••••" autocomplete="current-password" />
                <button type="button" (click)="showPassword.set(!showPassword())" class="absolute inset-y-0 right-3 text-xs font-semibold text-brand-600">{{ showPassword() ? 'Hide' : 'Show' }}</button>
              </div>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <p class="mt-1 text-xs font-medium text-red-600">Password is required.</p>
              }
            </div>
            <button type="submit" class="wp-btn-primary w-full" [disabled]="loading()">
              @if (loading()) { Signing in… } @else { Sign in }
            </button>
          </form>

          <p class="mt-6 text-center text-xs text-slate-400">
            <a routerLink="/login" class="wp-link">← Back to WorkProvider360</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class MonitoringLogin {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(MonitoringAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('changed')) {
      this.notice.set('Password updated. Please sign in with your new password.');
    }
    // A valid refresh cookie in this browser skips the form.
    if (!this.notice()) {
      this.auth.restore().subscribe((ok) => {
        if (ok) this.afterLogin();
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => this.afterLogin(),
      error: (err: MonitoringApiError) => {
        this.error.set(
          err.status === 423
            ? 'This account is temporarily locked. Try again later or contact a SuperAdmin.'
            : err.status === 401
              ? 'Invalid email or password.'
              : err.message,
        );
        this.loading.set(false);
      },
    });
  }

  private afterLogin(): void {
    if (this.auth.mustChangePassword()) {
      this.router.navigate(['/monitoring/change-password']);
      return;
    }
    const ret = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(ret && ret.startsWith('/monitoring') && !ret.startsWith('/monitoring/login') ? ret : '/monitoring');
  }
}
