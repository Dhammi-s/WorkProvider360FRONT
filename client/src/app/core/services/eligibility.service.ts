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
import {
  EligibilityBulkQueued,
  EligibilityBulkRequest,
  EligibilityCheck,
  EligibilityCheckRequest,
  EligibilityResult,
  ManualEligibilityRequest,
} from '../models/claims.model';
import { queryParams, unwrapData } from './billing-http';

/** Insurance eligibility (pVerify or manual): single / bulk checks, latest and history. */
@Injectable({ providedIn: 'root' })
export class EligibilityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/billing/eligibility`;

  check(request: EligibilityCheckRequest): Observable<EligibilityResult> {
    return this.http.post<ApiResponse<EligibilityResult>>(`${this.base}/check`, request).pipe(map((r) => unwrapData(r)));
  }

  manual(request: ManualEligibilityRequest): Observable<EligibilityResult> {
    return this.http.post<ApiResponse<EligibilityResult>>(`${this.base}/manual`, request).pipe(map((r) => unwrapData(r)));
  }

  bulk(request: EligibilityBulkRequest): Observable<EligibilityBulkQueued> {
    return this.http.post<ApiResponse<EligibilityBulkQueued>>(`${this.base}/bulk`, request).pipe(map((r) => unwrapData(r)));
  }

  /** Latest check per payer link of the client (isFresh set). */
  latest(clientId: number): Observable<EligibilityCheck[]> {
    return this.http
      .get<ApiResponse<EligibilityCheck[]>>(`${this.base}/latest`, { params: queryParams({ clientId }) })
      .pipe(map((r) => r.data ?? []));
  }

  history(clientId: number, clientPayerId?: number | null, includeRaw = false): Observable<EligibilityCheck[]> {
    const params = queryParams({ clientId, clientPayerId, includeRaw: includeRaw ? 'true' : null });
    return this.http
      .get<ApiResponse<EligibilityCheck[]>>(`${this.base}/history`, { params })
      .pipe(map((r) => r.data ?? []));
  }
}
