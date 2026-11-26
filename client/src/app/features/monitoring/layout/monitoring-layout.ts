/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MONITORING_NAV, MonitoringAuthService } from '../auth/monitoring-auth.service';

/** Monitoring shell: permission-filtered sidebar + topbar + routed content. */
@Component({
  selector: 'app-monitoring-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen bg-slate-50">
      @if (sidebarOpen()) {
        <div class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" (click)="sidebarOpen.set(false)"></div>
      }

      <aside class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 py-5 text-white transition-transform lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()">
        <div class="flex items-center gap-2.5 px-5">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
          </span>
          <div class="leading-tight">
            <div class="text-sm font-extrabold tracking-tight">WorkProvider<span class="text-accent-400">360</span></div>
            <div class="text-[11px] font-medium uppercase tracking-wider text-white/50">Dev Monitoring</div>
          </div>
        </div>

        <nav class="wp-scroll mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          @for (item of nav(); track item.path) {
            <a [routerLink]="['/monitoring', item.path]" routerLinkActive="bg-white/10 !text-white" (click)="sidebarOpen.set(false)"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="item.icon" /></svg>
              <span class="truncate">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="mx-3 mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
          <a routerLink="/dashboard" class="font-semibold text-white/80 hover:text-white">← Back to WorkProvider360</a>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button type="button" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" (click)="sidebarOpen.set(true)" aria-label="Open menu">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">Development Monitoring</p>
            <p class="truncate text-xs text-slate-400">Platform health across all tenants</p>
          </div>

          <div class="relative ml-auto">
            <button type="button" class="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100" (click)="menuOpen.set(!menuOpen())" aria-haspopup="menu">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{{ initials() }}</span>
              <span class="hidden text-left sm:block">
                <span class="block max-w-[10rem] truncate text-sm font-semibold text-slate-800">{{ user()?.fullName }}</span>
                <span class="block max-w-[10rem] truncate text-[11px] text-slate-400">{{ roles() }}</span>
              </span>
            </button>
            @if (menuOpen()) {
              <div class="fixed inset-0 z-30" (click)="menuOpen.set(false)"></div>
              <div class="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-card" role="menu">
                <div class="border-b border-slate-100 px-4 py-2 text-xs text-slate-400">{{ user()?.email }}</div>
                <a routerLink="/monitoring/change-password" (click)="menuOpen.set(false)" class="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Change password</a>
                <button type="button" (click)="signOut(false)" class="block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">Sign out</button>
                <button type="button" (click)="signOut(true)" class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">Sign out everywhere</button>
              </div>
            }
          </div>
        </header>

        <main class="flex-1 px-4 py-6 lg:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class MonitoringLayout {
  private readonly auth = inject(MonitoringAuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly sidebarOpen = signal(false);
  readonly menuOpen = signal(false);

  readonly nav = computed(() => (this.auth.user() ? MONITORING_NAV.filter((n) => this.auth.hasPermission(n.permission)) : []));
  readonly roles = computed(() => (this.user()?.roles ?? []).join(', '));
  readonly initials = computed(() =>
    (this.user()?.fullName ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join(''),
  );

  signOut(everywhere: boolean): void {
    this.menuOpen.set(false);
    const done = () => this.router.navigate(['/monitoring/login']);
    (everywhere ? this.auth.logoutAll() : this.auth.logout()).subscribe(done);
  }
}
