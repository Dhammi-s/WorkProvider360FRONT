/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ErrorEvent, ErrorGroup, ErrorTrace, MonitoringPaged } from '../models/monitoring.models';
import { MonitoringApi, QueryParams } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringErrorsService {
  private readonly api = inject(MonitoringApi);

  groups(q: QueryParams): Observable<MonitoringPaged<ErrorGroup>> {
    return this.api.get('/errors/groups', q);
  }
  events(q: QueryParams): Observable<MonitoringPaged<ErrorEvent>> {
    return this.api.get('/errors', q);
  }
  trace(correlationId: string, eventTime: string): Observable<ErrorTrace> {
    return this.api.get('/errors/trace', { correlationId, eventTime });
  }
}
