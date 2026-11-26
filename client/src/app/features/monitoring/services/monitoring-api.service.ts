/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MonitoringEnvelope } from '../models/monitoring.models';

/** Friendly error carrying the HTTP status so screens can show a "no access" state. */
export class MonitoringApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
  get forbidden(): boolean {
    return this.status === 403;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export const MONITORING_BASE = `${environment.apiBaseUrl}/monitoring`;

/** Convert any HTTP failure into a MonitoringApiError with a readable message. */
export function toMonitoringError(err: unknown): MonitoringApiError {
  if (err instanceof MonitoringApiError) return err;
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string; errors?: string[] } | null;
    let msg = '';
    if (body && typeof body === 'object') {
      if (Array.isArray(body.errors) && body.errors.length) msg = body.errors.join(' ');
      else if (body.message) msg = body.message;
    }
    if (!msg) {
      if (err.status === 0) msg = 'Cannot reach the server. Check your connection and try again.';
      else if (err.status === 403) msg = 'You do not have access to this area.';
      else if (err.status === 401) msg = 'Your session has expired. Please sign in again.';
      else if (err.status === 423) msg = 'This account is locked. Please try again later or contact a SuperAdmin.';
      else msg = 'Something went wrong. Please try again.';
    }
    return new MonitoringApiError(msg, err.status);
  }
  return new MonitoringApiError(err instanceof Error ? err.message : 'Unexpected error.', -1);
}

/** Unwrap the {success,data} envelope, throwing on success=false. */
export function unwrap<T>() {
  return (source: Observable<MonitoringEnvelope<T>>): Observable<T> =>
    source.pipe(
      map((res) => {
        if (!res || res.success === false) {
          throw new MonitoringApiError(res?.errors?.join(' ') || res?.message || 'Request failed.', 400);
        }
        return res.data as T;
      }),
      catchError((e) => throwError(() => toMonitoringError(e))),
    );
}

/** Base HTTP helper for every Development Monitoring endpoint. */
@Injectable({ providedIn: 'root' })
export class MonitoringApi {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
    }
    return this.http.get<MonitoringEnvelope<T>>(`${MONITORING_BASE}${path}`, { params: hp }).pipe(unwrap<T>());
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<MonitoringEnvelope<T>>(`${MONITORING_BASE}${path}`, body).pipe(unwrap<T>());
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<MonitoringEnvelope<T>>(`${MONITORING_BASE}${path}`, body).pipe(unwrap<T>());
  }
}
