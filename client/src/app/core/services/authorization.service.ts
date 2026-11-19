/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthorizationAccess,
  AuthorizationDetail,
  AuthorizationFormOptions,
  AuthorizationListQuery,
  AuthorizationStatus,
  AuthorizationSummary,
  AuthorizationVisit,
  Authorization,
  SaveAuthorizationRequest,
} from '../models/authorization.model';
import { PagedResult } from '../models/paged-result.model';
import { AuthService } from './auth.service';

/** Payer authorizations (Authorizations page, payer and client profiles, usage drawer). */
@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/authorizations`;

  /** The signed-in user's authorization access; null until loaded (or when the call failed). */
  readonly access = signal<AuthorizationAccess | null>(null);
  private access$: Observable<AuthorizationAccess | null> | null = null;
  private accessUserId: number | null = null;

  /** Loads the access once per signed-in user and caches it; errors resolve to null. */
  loadAccess(): Observable<AuthorizationAccess | null> {
    const userId = this.auth.user()?.userId ?? null;
    if (!this.access$ || this.accessUserId !== userId) {
      this.accessUserId = userId;
      this.access.set(null);
      this.access$ = this.http.get<ApiResponse<AuthorizationAccess>>(`${this.baseUrl}/access`).pipe(
        map((r) => this.unwrap(r)),
        tap((a) => this.access.set(a)),
        catchError(() => {
          this.access$ = null;
          return of(null);
        }),
        shareReplay(1),
      );
    }
    return this.access$;
  }

  list(query: AuthorizationListQuery = {}): Observable<PagedResult<Authorization>> {
    const params: Record<string, string> = {
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    };
    if (query.search) params['search'] = query.search;
    if (query.clientId != null) params['clientId'] = String(query.clientId);
    if (query.payerId != null) params['payerId'] = String(query.payerId);
    if (query.serviceTypeId != null) params['serviceTypeId'] = String(query.serviceTypeId);
    if (query.status) params['status'] = query.status;
    return this.http
      .get<ApiResponse<PagedResult<Authorization>>>(this.baseUrl, { params })
      .pipe(map((r) => this.unwrap(r)));
  }

  summary(clientId?: number | null, payerId?: number | null): Observable<AuthorizationSummary> {
    const params: Record<string, string> = {};
    if (clientId != null) params['clientId'] = String(clientId);
    if (payerId != null) params['payerId'] = String(payerId);
    return this.http
      .get<ApiResponse<AuthorizationSummary>>(`${this.baseUrl}/summary`, { params })
      .pipe(map((r) => this.unwrap(r)));
  }

  formOptions(clientId: number): Observable<AuthorizationFormOptions> {
    return this.http
      .get<ApiResponse<AuthorizationFormOptions>>(`${this.baseUrl}/form-options`, {
        params: { clientId: String(clientId) },
      })
      .pipe(map((r) => this.unwrap(r)));
  }

  get(id: number): Observable<AuthorizationDetail> {
    return this.http
      .get<ApiResponse<AuthorizationDetail>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  visits(id: number, page = 1, pageSize = 10): Observable<PagedResult<AuthorizationVisit>> {
    return this.http
      .get<ApiResponse<PagedResult<AuthorizationVisit>>>(`${this.baseUrl}/${id}/visits`, {
        params: { page: String(page), pageSize: String(pageSize) },
      })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page, pageSize }));
  }

  create(request: SaveAuthorizationRequest): Observable<AuthorizationDetail> {
    return this.http
      .post<ApiResponse<AuthorizationDetail>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: SaveAuthorizationRequest): Observable<AuthorizationDetail> {
    return this.http
      .put<ApiResponse<AuthorizationDetail>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  setStatus(id: number, status: AuthorizationStatus): Observable<AuthorizationDetail> {
    return this.http
      .patch<ApiResponse<AuthorizationDetail>>(`${this.baseUrl}/${id}/status`, { status })
      .pipe(map((r) => this.unwrap(r)));
  }

  /** Archives the authorization; the server refuses (409) when visits already use it. */
  remove(id: number): Observable<string> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map((r) => {
        if (!r.success) throw new Error(r.message ?? 'Could not delete the authorization.');
        return r.message ?? 'Authorization deleted.';
      }),
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
