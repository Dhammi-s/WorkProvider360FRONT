/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  CreateOfficeRequest,
  Office,
  OfficeMember,
  Timezone,
  UpdateOfficeRequest,
} from '../models/office.model';

@Injectable({ providedIn: 'root' })
export class OfficeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/offices`;

  timezones(): Observable<Timezone[]> {
    return this.http
      .get<ApiResponse<Timezone[]>>(`${this.baseUrl}/timezones`)
      .pipe(map((r) => r.data ?? []));
  }

  list(): Observable<Office[]> {
    return this.http.get<ApiResponse<Office[]>>(this.baseUrl).pipe(map((r) => r.data ?? []));
  }

  get(id: string): Observable<Office> {
    return this.http.get<ApiResponse<Office>>(`${this.baseUrl}/${id}`).pipe(map((r) => this.unwrap(r)));
  }

  members(id: string): Observable<OfficeMember[]> {
    return this.http
      .get<ApiResponse<OfficeMember[]>>(`${this.baseUrl}/${id}/members`)
      .pipe(map((r) => r.data ?? []));
  }

  create(request: CreateOfficeRequest): Observable<Office> {
    return this.http.post<ApiResponse<Office>>(this.baseUrl, request).pipe(map((r) => this.unwrap(r)));
  }

  update(id: string, request: UpdateOfficeRequest): Observable<Office> {
    return this.http
      .put<ApiResponse<Office>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  deactivate(id: string): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.message ?? 'Office deactivated.'));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
