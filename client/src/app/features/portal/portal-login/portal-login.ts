/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AgencyService } from '../../../core/services/agency.service';
import { BrandingService } from '../../../core/services/branding.service';
import { RoleName } from '../../../core/models/role.model';
import { Alert } from '../../../shared/ui/alert/alert';

/**
 * Dedicated client-portal sign-in. Styled distinctly (teal) from the staff
 * login. Clients land on /portal; a staff member who signs in here is routed to
 * their own home instead.
 */
@Component({
  selector: 'app-portal-login',
  imports: [ReactiveFormsModule, RouterLink, Alert],
  templateUrl: './portal-login.html',
})
export class PortalLogin {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly agency = inject(AgencyService);
  readonly branding = inject(BrandingService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  constructor() {
    this.branding.load();
    this.agency.load();
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
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email, password }, remember).subscribe({
      next: (user) => {
        this.router.navigateByUrl(this.auth.homeRouteFor(user.roleName as RoleName));
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Sign in failed. Please check your details.');
        this.loading.set(false);
      },
    });
  }
}
