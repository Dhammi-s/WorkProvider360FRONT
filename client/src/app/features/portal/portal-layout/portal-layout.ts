/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AgencyService } from '../../../core/services/agency.service';
import { BrandingService } from '../../../core/services/branding.service';

interface PortalNav {
  label: string;
  path: string;
  exact?: boolean;
}

@Component({
  selector: 'app-portal-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-layout.html',
})
export class PortalLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly agency = inject(AgencyService);
  readonly branding = inject(BrandingService);

  readonly menuOpen = signal(false);
  readonly user = this.auth.user;
  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? 'Client';
    return name
      .split(' ')
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  readonly nav: PortalNav[] = [
    { label: 'Home', path: '/portal', exact: true },
    { label: 'My Visits', path: '/portal/visits' },
    { label: 'Services', path: '/portal/services' },
    { label: 'My Profile', path: '/portal/profile' },
  ];

  constructor() {
    this.branding.load();
    this.agency.load();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }
}
