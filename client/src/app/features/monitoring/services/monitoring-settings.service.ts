/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MonitoringHealth, MonitoringSetting } from '../models/monitoring.models';
import { MonitoringApi } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringSettingsService {
  private readonly api = inject(MonitoringApi);

  list(): Observable<MonitoringSetting[]> {
    return this.api.get('/settings');
  }
  save(settings: { key: string; value: string }[]): Observable<unknown> {
    return this.api.put('/settings', { settings });
  }
  health(): Observable<MonitoringHealth> {
    return this.api.get('/settings/health');
  }
}
