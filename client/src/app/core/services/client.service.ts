/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/paged-result.model';
import { ClientVisit } from '../models/portal.model';
import {
  Client,
  ClientAccess,
  ClientSettings,
  EligibleCaregiver,
  SetPortalAccessRequest,
  UpdateClientStatusRequest,
  UpsertClientRequest,
  UpsertClientSettings,
} from '../models/client.model';

export interface ClientListFilters {
  officeId?: string;
  status?: string;
  serviceTypeId?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/clients`;

  access(): Observable<ClientAccess> {
    return this.http
      .get<ApiResponse<ClientAccess>>(`${this.baseUrl}/access`)
      .pipe(map((r) => this.unwrap(r)));
  }

  getSettings(): Observable<ClientSettings> {
    return this.http
      .get<ApiResponse<ClientSettings>>(`${this.baseUrl}/settings`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpsertClientSettings): Observable<ClientSettings> {
    return this.http
      .put<ApiResponse<ClientSettings>>(`${this.baseUrl}/settings`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  list(page = 1, pageSize = 10, filters?: ClientListFilters): Observable<PagedResult<Client>> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (filters?.officeId) params['officeId'] = filters.officeId;
    if (filters?.status) params['status'] = filters.status;
    if (filters?.serviceTypeId != null) params['serviceTypeId'] = String(filters.serviceTypeId);
    if (filters?.search) params['search'] = filters.search;
    return this.http
      .get<ApiResponse<PagedResult<Client>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page, pageSize }));
  }

  get(id: number): Observable<Client> {
    return this.http
      .get<ApiResponse<Client>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: UpsertClientRequest): Observable<Client> {
    return this.http
      .post<ApiResponse<Client>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: UpsertClientRequest): Observable<Client> {
    return this.http
      .put<ApiResponse<Client>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  setStatus(id: number, request: UpdateClientStatusRequest): Observable<string> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.baseUrl}/${id}/status`, request)
      .pipe(map((r) => r.message ?? 'Status updated.'));
  }

  setPortalAccess(id: number, request: SetPortalAccessRequest): Observable<Client> {
    return this.http
      .post<ApiResponse<Client>>(`${this.baseUrl}/${id}/portal-access`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  resendCredentials(id: number): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/resend-credentials`, {})
      .pipe(map((r) => r.message ?? 'Credentials sent.'));
  }

  eligibleCaregivers(id: number, serviceTypeId?: number): Observable<EligibleCaregiver[]> {
    const params: Record<string, string> = {};
    if (serviceTypeId != null) params['serviceTypeId'] = String(serviceTypeId);
    return this.http
      .get<ApiResponse<EligibleCaregiver[]>>(`${this.baseUrl}/${id}/eligible-caregivers`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  schedules(id: number, fromUtc?: string, toUtc?: string): Observable<ClientVisit[]> {
    const params: Record<string, string> = {};
    if (fromUtc) params['fromUtc'] = fromUtc;
    if (toUtc) params['toUtc'] = toUtc;
    return this.http
      .get<ApiResponse<ClientVisit[]>>(`${this.baseUrl}/${id}/schedules`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
