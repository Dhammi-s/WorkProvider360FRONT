/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-22
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnalysisAccess,
  AnalysisModule,
  AnalysisRecipient,
  AnalysisReportSummary,
  AnalysisResult,
  AnalysisSettings,
  AnalysisShareResult,
  RunAnalysisRequest,
  ShareAnalysisRequest,
  UpdateAnalysisSettings,
} from '../models/analysis.model';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/paged-result.model';

/** AI (neural network) Analysis API. */
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/analysis`;

  access(): Observable<AnalysisAccess> {
    return this.http.get<ApiResponse<AnalysisAccess>>(`${this.baseUrl}/access`).pipe(map((r) => this.unwrap(r)));
  }

  modules(): Observable<AnalysisModule[]> {
    return this.http.get<ApiResponse<AnalysisModule[]>>(`${this.baseUrl}/modules`).pipe(map((r) => r.data ?? []));
  }

  run(request: RunAnalysisRequest): Observable<AnalysisResult> {
    return this.http.post<ApiResponse<AnalysisResult>>(`${this.baseUrl}/run`, request).pipe(map((r) => this.unwrap(r)));
  }

  reports(page = 1, pageSize = 10): Observable<PagedResult<AnalysisReportSummary>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http
      .get<ApiResponse<PagedResult<AnalysisReportSummary>>>(`${this.baseUrl}/reports`, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page, pageSize }));
  }

  report(reportId: number): Observable<AnalysisResult> {
    return this.http.get<ApiResponse<AnalysisResult>>(`${this.baseUrl}/reports/${reportId}`).pipe(map((r) => this.unwrap(r)));
  }

  /** Self-contained HTML report (inline SVG charts) as text. */
  reportFile(reportId: number): Observable<string> {
    return this.http.get(`${this.baseUrl}/reports/${reportId}/file`, { responseType: 'text' });
  }

  recipients(): Observable<AnalysisRecipient[]> {
    return this.http.get<ApiResponse<AnalysisRecipient[]>>(`${this.baseUrl}/recipients`).pipe(map((r) => r.data ?? []));
  }

  share(reportId: number, request: ShareAnalysisRequest): Observable<{ result: AnalysisShareResult; message: string }> {
    return this.http
      .post<ApiResponse<AnalysisShareResult>>(`${this.baseUrl}/reports/${reportId}/share`, request)
      .pipe(map((r) => ({ result: this.unwrap(r), message: r.message ?? '' })));
  }

  getSettings(): Observable<AnalysisSettings> {
    return this.http.get<ApiResponse<AnalysisSettings>>(`${this.baseUrl}/settings`).pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpdateAnalysisSettings): Observable<AnalysisSettings> {
    return this.http.put<ApiResponse<AnalysisSettings>>(`${this.baseUrl}/settings`, request).pipe(map((r) => this.unwrap(r)));
  }

  runDailyNow(): Observable<string> {
    return this.http
      .post<ApiResponse<number | null>>(`${this.baseUrl}/daily/run-now`, {})
      .pipe(map((r) => r.message ?? 'Daily report sent.'));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
