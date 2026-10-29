/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-29
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export type TenantState = 'loading' | 'ready' | 'not-connected' | 'maintenance';

interface TenantStatus {
  resolved: boolean;
  maintenance: boolean;
  agencyName?: string | null;
  supportEmail: string;
}

/** Fallback when the API can't be asked (keep in sync with Platform:SupportEmail). */
const DEFAULT_SUPPORT_EMAIL = 'jassadhammi@gmail.com';

/**
 * Is this domain connected to an agency, and is that agency in maintenance?
 * Checked once on start-up (GET /api/tenant/status) and again whenever an API
 * call reports maintenance or an unresolved tenant. The app shell shows a
 * full-screen page instead of the app for 'not-connected' and 'maintenance'.
 */
@Injectable({ providedIn: 'root' })
export class TenantStatusService {
  // HttpBackend skips the interceptors: no token, no 401 redirect to /login.
  private readonly http = new HttpClient(inject(HttpBackend));

  readonly state = signal<TenantState>('loading');
  readonly agencyName = signal<string | null>(null);
  readonly supportEmail = signal(DEFAULT_SUPPORT_EMAIL);
  readonly host = typeof window !== 'undefined' ? window.location.hostname : '';

  load(): void {
    const domain = environment.tenantDomain || this.host;
    // Never leave the app blank if the API is slow: show it after 8 seconds.
    const fallback = setTimeout(() => this.state() === 'loading' && this.state.set('ready'), 8000);

    this.http
      .get<ApiResponse<TenantStatus>>(`${environment.apiBaseUrl}/tenant/status`, { headers: { 'X-Tenant-Domain': domain } })
      .subscribe({
        next: (r) => {
          clearTimeout(fallback);
          const s = r.data;
          if (!s) return this.state.set('ready');
          this.supportEmail.set(s.supportEmail || DEFAULT_SUPPORT_EMAIL);
          this.agencyName.set(s.agencyName ?? null);
          this.state.set(!s.resolved ? 'not-connected' : s.maintenance ? 'maintenance' : 'ready');
        },
        error: (err: HttpErrorResponse) => {
          clearTimeout(fallback);
          // API down / unreachable: show the app as usual (the offline page and
          // normal error messages still apply) rather than blocking it.
          this.state.set(TenantStatusService.isMaintenance(err) ? 'maintenance' : 'ready');
        },
      });
  }

  markMaintenance(): void {
    this.state.set('maintenance');
  }

  markNotConnected(): void {
    this.state.set('not-connected');
  }

  /** A 503 from MaintenanceModeMiddleware (error code MAINTENANCE_MODE). */
  static isMaintenance(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 503) return false;
    const errors = (err.error as { errors?: unknown } | null)?.errors;
    return Array.isArray(errors) && errors.includes('MAINTENANCE_MODE');
  }

  /** A 400 from the API because this domain isn't linked to an agency. */
  static isTenantNotResolved(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 400) return false;
    const message = (err.error as { message?: string } | null)?.message ?? '';
    return message.includes('Tenant has not been resolved');
  }
}
