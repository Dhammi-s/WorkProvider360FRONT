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
import { ChatWidget } from '../chatbot/chat-widget';
import { NotificationBell } from '../notifications/notification-bell';
import { RoleName } from '../../../core/models/role.model';
import { AgencyService } from '../../../core/services/agency.service';
import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import { ShortcutService } from '../../../core/services/shortcut.service';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatWidget, NotificationBell],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService);
  private readonly shortcuts = inject(ShortcutService);
  private readonly agency = inject(AgencyService);
  private readonly users = inject(UserService);

  readonly user = this.auth.user;
  readonly logo = this.branding.logo;
  readonly agencyName = this.agency.name;
  readonly avatarUrl = signal<string | null>(null);
  readonly sidebarOpen = signal(false);
  readonly menuOpen = signal(false);

  /** Desktop-only: when true the sidebar shrinks to an icons-only rail. Persisted. */
  readonly collapsed = signal<boolean>(
    typeof localStorage !== 'undefined' && localStorage.getItem('wp-sidebar-collapsed') === '1',
  );

  /** True while the router is navigating between pages — drives the blur loader. */
  readonly navigating = signal(false);

  /** Keep the loader on screen for at least this long so it never just flickers. */
  private static readonly MIN_LOADER_MS = 1500;
  private navStartedAt = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.branding.load();
    this.shortcuts.load();
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
    { label: 'Team', path: '/dashboard/users', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Applications', path: '/dashboard/applications', icon: 'M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Offices', path: '/dashboard/offices', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Clients', path: '/dashboard/clients', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Skills & Services', path: '/dashboard/service-types', icon: 'M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6L12 2z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Scheduler', path: '/dashboard/scheduler', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Meetings', path: '/dashboard/meetings', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Reports', path: '/dashboard/reports', icon: 'M9 17v-6m3 6V7m3 10v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Live Map', path: '/dashboard/live-map', icon: 'M9 20l-5.4 1.8a1 1 0 01-1.3-1V5.5a1 1 0 01.7-1L9 3m0 17l6-2m-6 2V3m6 15l5.4 1.8a1 1 0 001.3-1V4.5a1 1 0 00-.7-1L15 1.7m0 16.3V3.7m0 0L9 3M12 11a2 2 0 100-4 2 2 0 000 4z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Announcements', path: '/dashboard/announcements', icon: 'M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6' },
    { label: 'Accounting', path: '/dashboard/accounting', icon: 'M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z', roles: ['SuperAdmin'] },
    { label: 'Point of Sale', path: '/dashboard/pos', icon: 'M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2 4h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z', roles: ['SuperAdmin', 'Admin'] },
    { label: 'Email Logs', path: '/dashboard/logs', icon: 'M4 6h16M4 6a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2M4 6l8 6 8-6', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'My Profile', path: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  // Quick-access items shown as icon buttons in the topbar (next to the bell),
  // not in the sidebar.
  private readonly allTopNav: NavItem[] = [
    { label: 'Security', path: '/dashboard/security', icon: 'M12 3l7 3v5c0 4.4-3 7.3-7 8.5-4-1.2-7-4.1-7-8.5V6l7-3zM9.5 11.8l1.8 1.8 3.2-3.6', roles: ['SuperAdmin'] },
    { label: 'Settings', path: '/dashboard/settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'Help Center', path: '/dashboard/help', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.8 9.3a2.3 2.3 0 114 1.6c-.7.8-1.8 1.1-1.8 2.3M12 17h.01' },
    { label: 'Support', path: '/dashboard/support', icon: 'M20 15a2 2 0 01-2 2H8l-4 3V6a2 2 0 012-2h12a2 2 0 012 2v9zM9 9h6M9 12.5h4' },
    { label: 'About', path: '/dashboard/about', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8h.01M11 11.5h1V16h1' },
  ];

  readonly nav = computed<NavItem[]>(() => {
    const role = this.auth.roleName();
    return this.allNav.filter((item) => !item.roles || (role && item.roles.includes(role)));
  });

  readonly topNav = computed<NavItem[]>(() => {
    const role = this.auth.roleName();
    return this.allTopNav.filter((item) => !item.roles || (role && item.roles.includes(role)));
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

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem('wp-sidebar-collapsed', next ? '1' : '0');
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
