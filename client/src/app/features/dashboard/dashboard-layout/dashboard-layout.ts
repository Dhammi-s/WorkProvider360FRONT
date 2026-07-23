import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RoleName } from '../../../core/models/role.model';
import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';

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

  readonly user = this.auth.user;
  readonly logo = this.branding.logo;
  readonly sidebarOpen = signal(false);
  readonly menuOpen = signal(false);

  constructor() {
    this.branding.load();
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
    { label: 'Settings', path: '/dashboard/settings', icon: 'M10.3 3.3a2 2 0 013.4 0l.5.9 1 .1a2 2 0 011.7 1.7l.1 1 .9.5a2 2 0 010 3.4l-.9.5-.1 1a2 2 0 01-1.7 1.7l-1 .1-.5.9a2 2 0 01-3.4 0l-.5-.9-1-.1a2 2 0 01-1.7-1.7l-.1-1-.9-.5a2 2 0 010-3.4l.9-.5.1-1a2 2 0 011.7-1.7l1-.1.5-.9zM12 15a3 3 0 100-6 3 3 0 000 6z', roles: ['SuperAdmin', 'Admin', 'Manager'] },
    { label: 'My Profile', path: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
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
