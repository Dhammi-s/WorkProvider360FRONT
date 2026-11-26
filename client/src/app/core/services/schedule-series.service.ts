/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/paged-result.model';
import {
  PublishRequest,
  PublishResult,
  SaveSeriesRequest,
  ScheduleSeries,
  SeriesListQuery,
  SeriesPreview,
  SeriesStatusRequest,
} from '../models/schedule-series.model';

/** Master (recurring) schedules: CRUD, status, preview and publish. */
@Injectable({ providedIn: 'root' })
export class ScheduleSeriesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/schedule-series`;

  list(query: SeriesListQuery = {}): Observable<PagedResult<ScheduleSeries>> {
    const params: Record<string, string> = {
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    };
    if (query.clientId != null) params['clientId'] = String(query.clientId);
    if (query.status) params['status'] = query.status;
    if (query.search) params['search'] = query.search;
    return this.http
      .get<ApiResponse<PagedResult<ScheduleSeries>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page: 1, pageSize: 20 }));
  }

  get(id: number): Observable<ScheduleSeries> {
    return this.http
      .get<ApiResponse<ScheduleSeries>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: SaveSeriesRequest): Observable<ScheduleSeries> {
    return this.http
      .post<ApiResponse<ScheduleSeries>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: SaveSeriesRequest): Observable<ScheduleSeries> {
    return this.http
      .put<ApiResponse<ScheduleSeries>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  setStatus(id: number, request: SeriesStatusRequest): Observable<ScheduleSeries> {
    return this.http
      .patch<ApiResponse<ScheduleSeries>>(`${this.baseUrl}/${id}/status`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  /** 409 when visits were already published (end the series instead). */
  remove(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.message ?? 'Master schedule deleted.'));
  }

  preview(request: PublishRequest): Observable<SeriesPreview> {
    return this.http
      .post<ApiResponse<SeriesPreview>>(`${this.baseUrl}/preview`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  publish(request: PublishRequest): Observable<PublishResult> {
    return this.http
      .post<ApiResponse<PublishResult>>(`${this.baseUrl}/publish`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
