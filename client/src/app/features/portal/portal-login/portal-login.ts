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
import { BrandingService } from '../../../core/services/branding.service';
import { RoleName } from '../../../core/models/role.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { InstallPrompt } from '../../auth/install-prompt/install-prompt';
import { PwaService } from '../../../core/services/pwa.service';

/**
 * Dedicated client-portal sign-in. Styled distinctly (teal) from the staff
 * login. Clients land on /portal; a staff member who signs in here is routed to
 * their own home instead.
 */
@Component({
  selector: 'app-portal-login',
  imports: [ReactiveFormsModule, RouterLink, Alert, InstallPrompt],
  templateUrl: './portal-login.html',
})
export class PortalLogin {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly branding = inject(BrandingService);
  private readonly pwa = inject(PwaService);

  readonly agencyName = signal('');
  readonly logo = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  constructor() {
    // Public page: use ONLY the anonymous login-branding endpoint. Authed calls
    // (agency/branding) would 401 while logged out and the error interceptor
    // would bounce the visitor to the staff /login.
    this.branding.getLoginPage().subscribe({
      next: (page) => {
        if (!page) return;
        if (page.agencyName) this.agencyName.set(page.agencyName);
        this.logo.set(page.logo ?? null);
        // White-label the installable client app (opens at /portal).
        this.pwa.applyManifest(this.agencyName(), page.logo, '/portal');
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
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email, password }, remember).subscribe({
      next: (user) => {
        const home = this.auth.homeRouteFor(user.roleName as RoleName);
        // Honour a portal deep-link only; otherwise land on the role's home.
        const ret = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(ret && ret.startsWith('/portal') ? ret : home);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Sign in failed. Please check your details.');
        this.loading.set(false);
      },
    });
  }
}
