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
import { ServiceType } from '../models/service-type.model';
import {
  ClientVisit,
  ClientVisitDetail,
  PortalDashboard,
  PortalProfile,
  UpdatePortalProfileRequest,
} from '../models/portal.model';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/portal`;

  me(): Observable<PortalProfile> {
    return this.http
      .get<ApiResponse<PortalProfile>>(`${this.baseUrl}/me`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateMe(request: UpdatePortalProfileRequest): Observable<PortalProfile> {
    return this.http
      .put<ApiResponse<PortalProfile>>(`${this.baseUrl}/me`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  dashboard(): Observable<PortalDashboard> {
    return this.http
      .get<ApiResponse<PortalDashboard>>(`${this.baseUrl}/dashboard`)
      .pipe(map((r) => this.unwrap(r)));
  }

  visits(status?: string, fromUtc?: string, toUtc?: string): Observable<ClientVisit[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    if (fromUtc) params['fromUtc'] = fromUtc;
    if (toUtc) params['toUtc'] = toUtc;
    return this.http
      .get<ApiResponse<ClientVisit[]>>(`${this.baseUrl}/visits`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  visit(id: number): Observable<ClientVisitDetail> {
    return this.http
      .get<ApiResponse<ClientVisitDetail>>(`${this.baseUrl}/visits/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  serviceTypes(): Observable<ServiceType[]> {
    return this.http
      .get<ApiResponse<ServiceType[]>>(`${this.baseUrl}/service-types`)
      .pipe(map((r) => r.data ?? []));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
