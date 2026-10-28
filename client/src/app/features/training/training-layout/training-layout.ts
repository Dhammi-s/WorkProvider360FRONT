/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import { TrainingSessionService } from '../../../core/services/training-session.service';

type TrainingRole = 'SuperAdmin' | 'Admin' | 'Manager' | 'User';

interface TrainingNav {
  label: string;
  path: string;
  icon: string; // inline SVG path data
  roles?: TrainingRole[]; // undefined = everyone in the portal
  exact?: boolean;
}

/**
 * Training portal shell, styled like the client portal. Uses ONLY the training
 * session (and anonymous branding), never main-app endpoints, so it works for
 * people who signed in on /training-login without a main-app session.
 */
@Component({
  selector: 'app-training-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './training-layout.html',
})
export class TrainingLayout {
  private readonly session = inject(TrainingSessionService);
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService);
  /** Main-app session, if any: shows a "Back to WorkProvider360" link. */
  readonly mainAuth = inject(AuthService);

  readonly agencyName = signal('');
  readonly logo = signal<string | null>(null);
  readonly sidebarOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly user = this.session.user;

  readonly initials = computed(() =>
    (this.user()?.fullName ?? 'T')
      .split(' ')
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  /** "Back to main app" only when the main session is the same person. */
  readonly canGoBack = computed(
    () => this.mainAuth.isAuthenticated() && this.mainAuth.user()?.userId === this.user()?.userId,
  );

  readonly roleLabel = computed(() => {
    const role = this.user()?.roleName;
    return role === 'User' ? 'Caregiver' : role === 'SuperAdmin' ? 'Super Admin' : (role ?? '');
  });

  private readonly allNav: TrainingNav[] = [
    { label: 'Dashboard', path: '/training', exact: true, icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { label: 'My Trainings', path: '/training/my', icon: 'M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5s3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25' },
    { label: 'Team Trainings', path: '/training/assignments', roles: ['SuperAdmin', 'Admin', 'Manager'], icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z' },
    { label: 'Approvals', path: '/training/approvals', roles: ['SuperAdmin', 'Admin', 'Manager'], icon: 'M9 12l2 2 4-4m5.6-4.02A11.96 11.96 0 0112 2.94a11.96 11.96 0 01-8.6 3.04A12 12 0 003 9c0 5.6 3.82 10.3 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.04-.13-2.05-.38-3.02z' },
    { label: 'Catalog', path: '/training/catalog', roles: ['SuperAdmin', 'Admin', 'Manager'], icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { label: 'Reports', path: '/training/reports', roles: ['SuperAdmin', 'Admin', 'Manager'], icon: 'M9 17v-6m3 6V7m3 10v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Access', path: '/training/access', roles: ['SuperAdmin', 'Admin', 'Manager'], icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.74 5.74L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.59a1 1 0 01.29-.7l5.97-5.97A6 6 0 1121 9z' },
    { label: 'Settings', path: '/training/settings', roles: ['SuperAdmin'], icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-2.82-1.17l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 003 15.4H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 0010.4 4.6V3a2 2 0 114 0v.09a1.65 1.65 0 002.82 1.17l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0021 10.4h.09a2 2 0 110 4H21a1.65 1.65 0 00-1.6.6z' },
  ];

  readonly nav = computed(() => {
    const role = this.user()?.roleName as TrainingRole | undefined;
    return this.allNav.filter((n) => !n.roles || (role && n.roles.includes(role)));
  });

  constructor() {
    this.branding.getLoginPage().subscribe({
      next: (page) => {
        if (!page) return;
        if (page.agencyName) this.agencyName.set(page.agencyName);
        this.logo.set(page.logo ?? null);
      },
      error: () => {},
    });
  }

  /** Ends only the training session; a main-app session stays signed in. */
  logout(): void {
    this.session.clear();
    this.router.navigateByUrl('/training-login');
  }
}
