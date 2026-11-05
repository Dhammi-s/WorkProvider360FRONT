/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardBreakdowns, DashboardSummary, Timeseries } from '../models/monitoring.models';
import { MonitoringApi, QueryParams } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringDashboardService {
  private readonly api = inject(MonitoringApi);

  summary(q: QueryParams): Observable<DashboardSummary> {
    return this.api.get('/dashboard/summary', q);
  }
  timeseries(q: QueryParams): Observable<Timeseries> {
    return this.api.get('/dashboard/timeseries', q);
  }
  breakdowns(q: QueryParams): Observable<DashboardBreakdowns> {
    return this.api.get('/dashboard/breakdowns', q);
  }
}
