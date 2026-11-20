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
  ResolveVisitException,
  VisitException,
  VisitExceptionQuery,
} from '../models/visit-exception.model';

/** Missed clock-ins / clock-outs (office list + resolve). */
@Injectable({ providedIn: 'root' })
export class VisitExceptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/visit-exceptions`;

  list(query: VisitExceptionQuery = {}): Observable<PagedResult<VisitException>> {
    const params: Record<string, string> = {
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    };
    if (query.status) params['status'] = query.status;
    if (query.type) params['type'] = query.type;
    if (query.from) params['from'] = query.from;
    if (query.to) params['to'] = query.to;
    if (query.userId != null) params['userId'] = String(query.userId);
    return this.http
      .get<ApiResponse<PagedResult<VisitException>>>(this.baseUrl, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page: 1, pageSize: 20 }));
  }

  /** 409 when already resolved. */
  resolve(id: number, request: ResolveVisitException): Observable<VisitException> {
    return this.http
      .post<ApiResponse<VisitException>>(`${this.baseUrl}/${id}/resolve`, request)
      .pipe(
        map((r) => {
          if (!r.success || r.data == null) throw new Error(r.message ?? 'Request failed.');
          return r.data;
        }),
      );
  }
}
