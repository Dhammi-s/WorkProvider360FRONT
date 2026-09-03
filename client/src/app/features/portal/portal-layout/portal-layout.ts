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
import { ShortcutService } from '../../../core/services/shortcut.service';

interface PortalNav {
  label: string;
  path: string;
  icon: string;
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
  private readonly shortcuts = inject(ShortcutService);

  readonly sidebarOpen = signal(false);
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
    { label: 'Home', path: '/portal', exact: true, icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { label: 'Calendar', path: '/portal/calendar', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'My Visits', path: '/portal/visits', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: 'Services', path: '/portal/services', icon: 'M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6L12 2z' },
    { label: 'My Profile', path: '/portal/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  constructor() {
    this.branding.load();
    this.shortcuts.load();
    this.agency.load();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/portal-login'),
      error: () => this.router.navigateByUrl('/portal-login'),
    });
  }
}
