/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { RoleName } from '../../../core/models/role.model';
import { AgencyService } from '../../../core/services/agency.service';
import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import { UserService } from '../../../core/services/user.service';

interface NavItem {
  label: string;
  path?: string;
  icon: string; // inline SVG path data
  roles?: RoleName[]; // undefined = all roles
  soon?: boolean;
}

/** Authenticated app shell: role-filtered sidebar + topbar + routed content. */
@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService);
  private readonly agency = inject(AgencyService);
  private readonly users = inject(UserService);

  readonly user = this.auth.user;
  readonly logo = this.branding.logo;
  readonly agencyName = this.agency.name;
  readonly avatarUrl = signal<string | null>(null);
  readonly sidebarOpen = signal(false);
  readonly menuOpen = signal(false);

  /** True while the router is navigating between pages — drives the blur loader. */
  readonly navigating = signal(false);

  /** Keep the loader on screen for at least this long so it never just flickers. */
  private static readonly MIN_LOADER_MS = 1500;
  private navStartedAt = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.branding.load();
    this.agency.load();
    this.users.getMe().subscribe({
      next: (me) => this.avatarUrl.set(me.avatarUrl ?? null),
      error: () => {},
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        clearTimeout(this.hideTimer);
        this.navStartedAt = Date.now();
        this.navigating.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Hide only after the minimum display time has elapsed.
        const elapsed = Date.now() - this.navStartedAt;
        const remaining = Math.max(0, DashboardLayout.MIN_LOADER_MS - elapsed);
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.navigating.set(false), remaining);
      }
    });
  }

  private readonly allNav: NavItem[] = [
    { label: 'Overview', path: '/dashboard', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { label: 'Team', path: '/dashboard/users', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Applications', path: '/dashboard/applications', icon: 'M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Offices', path: '/dashboard/offices', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Scheduler', path: '/dashboard/scheduler', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Reports', path: '/dashboard/reports', icon: 'M9 17v-6m3 6V7m3 10v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Live Map', path: '/dashboard/live-map', icon: 'M9 20l-5.4 1.8a1 1 0 01-1.3-1V5.5a1 1 0 01.7-1L9 3m0 17l6-2m-6 2V3m6 15l5.4 1.8a1 1 0 001.3-1V4.5a1 1 0 00-.7-1L15 1.7m0 16.3V3.7m0 0L9 3M12 11a2 2 0 100-4 2 2 0 000 4z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Announcements', path: '/dashboard/announcements', icon: 'M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6' },
    { label: 'Accounting', path: '/dashboard/accounting', icon: 'M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z', roles: ['SuperAdmin'] },
    { label: 'Point of Sale', path: '/dashboard/pos', icon: 'M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2 4h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Email Logs', path: '/dashboard/logs', icon: 'M4 6h16M4 6a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2M4 6l8 6 8-6', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Security', path: '/dashboard/security', icon: 'M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z M9.5 12l2 2 3.5-4', roles: ['SuperAdmin'] },
    { label: 'Settings', path: '/dashboard/settings', icon: 'M10.3 3.3a2 2 0 013.4 0l.5.9 1 .1a2 2 0 011.7 1.7l.1 1 .9.5a2 2 0 010 3.4l-.9.5-.1 1a2 2 0 01-1.7 1.7l-1 .1-.5.9a2 2 0 01-3.4 0l-.5-.9-1-.1a2 2 0 01-1.7-1.7l-.1-1-.9-.5a2 2 0 010-3.4l.9-.5.1-1a2 2 0 011.7-1.7l1-.1.5-.9zM12 15a3 3 0 100-6 3 3 0 000 6z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'My Profile', path: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: 'Help Center', path: '/dashboard/help', icon: 'M9.1 9a3 3 0 115.8 1c0 2-3 2-3 4M12 17h.01M12 21a9 9 0 100-18 9 9 0 000 18z' },
    { label: 'Support', path: '/dashboard/support', icon: 'M18.4 5.6a9 9 0 11-12.8 0M12 8a4 4 0 100 8 4 4 0 000-8zM8.5 8.5L5.6 5.6m9.9 2.9l2.9-2.9m-2.9 9.9l2.9 2.9m-9.9-2.9l-2.9 2.9' },
    { label: 'About', path: '/dashboard/about', icon: 'M12 8h.01M11 12h1v4h1M12 21a9 9 0 100-18 9 9 0 000 18z' },
  ];

  readonly nav = computed<NavItem[]>(() => {
    const role = this.auth.roleName();
    return this.allNav.filter((item) => !item.roles || (role && item.roles.includes(role)));
  });

  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || 'U';
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }
}
