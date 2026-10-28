/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import { TrainingSessionService } from '../../../core/services/training-session.service';
import { Alert } from '../../../shared/ui/alert/alert';

/**
 * Training portal sign-in with the separate training username + password.
 * Staff who are already signed in to the main app can skip this and use
 * "Continue with my WorkProvider360 account" (single sign-on).
 */
@Component({
  selector: 'app-training-login',
  imports: [ReactiveFormsModule, RouterLink, Alert],
  templateUrl: './training-login.html',
})
export class TrainingLogin {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(TrainingSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly branding = inject(BrandingService);
  readonly mainAuth = inject(AuthService);

  readonly agencyName = signal('');
  readonly logo = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // Public page: anonymous branding only (authed calls would bounce to /login).
    this.branding.getLoginPage().subscribe({
      next: (page) => {
        if (!page) return;
        if (page.agencyName) this.agencyName.set(page.agencyName);
        this.logo.set(page.logo ?? null);
      },
      error: () => {},
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.session.login(username.trim(), password).subscribe({
      next: () => this.goHome(),
      error: (err: Error) => {
        this.error.set(err.message || 'Sign in failed. Please check your details.');
        this.loading.set(false);
      },
    });
  }

  /** Single sign-on with the main-app session (only shown when one exists). */
  continueWithMainAccount(): void {
    this.loading.set(true);
    this.error.set('');
    this.session.singleSignOn().subscribe({
      next: () => this.goHome(),
      error: (err: Error) => {
        this.error.set(err.message || 'Could not open the training portal.');
        this.loading.set(false);
      },
    });
  }

  private goHome(): void {
    const ret = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(ret && ret.startsWith('/training') ? ret : '/training');
  }
}
