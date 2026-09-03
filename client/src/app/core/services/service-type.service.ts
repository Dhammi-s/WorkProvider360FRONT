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
import { ServiceType, UpsertServiceTypeRequest } from '../models/service-type.model';

@Injectable({ providedIn: 'root' })
export class ServiceTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/service-types`;

  list(): Observable<ServiceType[]> {
    return this.http.get<ApiResponse<ServiceType[]>>(this.baseUrl).pipe(map((r) => r.data ?? []));
  }

  active(): Observable<ServiceType[]> {
    return this.http
      .get<ApiResponse<ServiceType[]>>(`${this.baseUrl}/active`)
      .pipe(map((r) => r.data ?? []));
  }

  get(id: number): Observable<ServiceType> {
    return this.http
      .get<ApiResponse<ServiceType>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: UpsertServiceTypeRequest): Observable<ServiceType> {
    return this.http
      .post<ApiResponse<ServiceType>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: UpsertServiceTypeRequest): Observable<ServiceType> {
    return this.http
      .put<ApiResponse<ServiceType>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  deactivate(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.message ?? 'Service type deactivated.'));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
