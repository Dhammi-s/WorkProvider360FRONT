/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MonitoringPaged, TenantCompareRow, TenantOverview, TenantStat } from '../models/monitoring.models';
import { MonitoringApi, QueryParams } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringTenantsService {
  private readonly api = inject(MonitoringApi);

  list(q: QueryParams): Observable<MonitoringPaged<TenantStat>> {
    return this.api.get('/tenants', q);
  }
  overview(tenantId: number, q: QueryParams): Observable<TenantOverview> {
    return this.api.get(`/tenants/${tenantId}/overview`, q);
  }
  compare(ids: number[], q: QueryParams): Observable<TenantCompareRow[]> {
    return this.api.get('/tenants/compare', { ...q, ids: ids.join(',') });
  }
}
