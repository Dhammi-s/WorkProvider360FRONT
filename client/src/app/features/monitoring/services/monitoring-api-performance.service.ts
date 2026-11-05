/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiRequestRow, EndpointStat, MonitoringPaged } from '../models/monitoring.models';
import { MonitoringApi, QueryParams } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringApiPerformanceService {
  private readonly api = inject(MonitoringApi);

  endpoints(q: QueryParams): Observable<MonitoringPaged<EndpointStat>> {
    return this.api.get('/api-performance/endpoints', q);
  }
  requests(q: QueryParams): Observable<MonitoringPaged<ApiRequestRow>> {
    return this.api.get('/api-performance/requests', q);
  }
}
