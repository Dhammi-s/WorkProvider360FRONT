/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DatabaseOverview } from '../models/monitoring.models';
import { MonitoringApi, QueryParams } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringDatabaseService {
  private readonly api = inject(MonitoringApi);

  overview(q: QueryParams): Observable<DatabaseOverview> {
    return this.api.get('/database/overview', q);
  }
}
