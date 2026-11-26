/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { MonitoringEnvelope, MonitoringLoginData, MonitoringUser } from '../models/monitoring.models';
import { MONITORING_BASE, unwrap } from '../services/monitoring-api.service';

const CSRF_HEADERS = { 'X-Monitoring-CSRF': '1' };

/** Monitoring navigation entries, in sidebar order, with their required permission. */
export const MONITORING_NAV: { label: string; path: string; permission: string; icon: string }[] = [
  { label: 'Dashboard', path: 'dashboard', permission: 'dashboard.view', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { label: 'API Performance', path: 'api-performance', permission: 'apiperformance.view', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { label: 'Application Logs', path: 'logs', permission: 'logs.view', icon: 'M4 6h16M4 12h16M4 18h10' },
  { label: 'Error Tracking', path: 'errors', permission: 'errors.view', icon: 'M12 9v4m0 4h.01M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' },
  { label: 'Tenant Monitoring', path: 'tenants', permission: 'tenants.view', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1' },
  { label: 'Database Monitoring', path: 'database', permission: 'database.view', icon: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7m-16 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5' },
  { label: 'Developer Management', path: 'developers', permission: 'users.manage', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z' },
  { label: 'Audit Logs', path: 'audit', permission: 'audit.view', icon: 'M9 12l2 2 4-4m5.6-3.1A12 12 0 0112 2.9 12 12 0 003.4 7.9 12 12 0 003 12c0 5.2 3.4 9.6 8 11 4.6-1.4 8-5.8 8-11 0-1.4-.2-2.8-.6-4.1z' },
  { label: 'Settings', path: 'settings', permission: 'settings.view', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z' },
];

/**
 * Development Monitoring session. Completely separate from the main-app AuthService:
 * the short-lived access token lives ONLY in memory (a signal); the refresh token is
 * an HttpOnly cookie managed by the server.
 */
@Injectable({ providedIn: 'root' })
export class MonitoringAuthService {
  private readonly http = inject(HttpClient);

  private readonly token = signal<string | null>(null);
  readonly user = signal<MonitoringUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.token() && !!this.user());
  readonly mustChangePassword = computed(() => !!this.user()?.mustChangePassword);
  private readonly permissionSet = computed(() => new Set(this.user()?.permissions ?? []));

  private refreshInFlight$: Observable<MonitoringLoginData> | null = null;

  get accessToken(): string | null {
    return this.token();
  }

  hasPermission(permission: string): boolean {
    return this.permissionSet().has(permission);
  }

  /** First monitoring page the current user is allowed to open, or null. */
  firstAllowedPath(): string | null {
    return MONITORING_NAV.find((n) => this.hasPermission(n.permission))?.path ?? null;
  }

  login(email: string, password: string): Observable<MonitoringUser> {
    return this.http
      .post<MonitoringEnvelope<MonitoringLoginData>>(
        `${MONITORING_BASE}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(
        unwrap<MonitoringLoginData>(),
        tap((d) => this.setSession(d)),
        map((d) => d.user),
      );
  }

  /** Single-flight refresh using the HttpOnly cookie. */
  refresh(): Observable<MonitoringLoginData> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<MonitoringEnvelope<MonitoringLoginData>>(
          `${MONITORING_BASE}/auth/refresh`,
          {},
          { withCredentials: true, headers: CSRF_HEADERS },
        )
        .pipe(
          unwrap<MonitoringLoginData>(),
          tap((d) => this.setSession(d)),
          finalize(() => (this.refreshInFlight$ = null)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.refreshInFlight$;
  }

  /** Restore the session on app start: true when a valid session exists. */
  restore(): Observable<boolean> {
    if (this.isAuthenticated()) return of(true);
    return this.refresh().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Reload the profile (e.g. after a permission change). */
  loadMe(): Observable<MonitoringUser> {
    return this.http
      .get<MonitoringEnvelope<MonitoringUser>>(`${MONITORING_BASE}/auth/me`)
      .pipe(
        unwrap<MonitoringUser>(),
        tap((u) => this.user.set(u)),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http
      .post<MonitoringEnvelope<unknown>>(`${MONITORING_BASE}/auth/change-password`, { currentPassword, newPassword })
      .pipe(unwrap<unknown>());
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<unknown> {
    return this.http
      .post<MonitoringEnvelope<unknown>>(`${MONITORING_BASE}/auth/reset-password`, { email, token, newPassword })
      .pipe(unwrap<unknown>());
  }

  logout(): Observable<void> {
    return this.http
      .post(`${MONITORING_BASE}/auth/logout`, {}, { withCredentials: true, headers: CSRF_HEADERS })
      .pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
        finalize(() => this.clearSession()),
      );
  }

  logoutAll(): Observable<void> {
    return this.http.post(`${MONITORING_BASE}/auth/logout-all`, {}, { withCredentials: true }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
    );
  }

  clearSession(): void {
    this.token.set(null);
    this.user.set(null);
  }

  private setSession(data: MonitoringLoginData): void {
    this.token.set(data.accessToken);
    this.user.set(data.user);
  }
}
