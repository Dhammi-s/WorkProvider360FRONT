/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateMonitoringUserRequest,
  MonitoringPaged,
  MonitoringPermissionInfo,
  MonitoringRoleInfo,
  MonitoringUser,
  ResetTokenResult,
} from '../models/monitoring.models';
import { MonitoringApi, QueryParams } from './monitoring-api.service';

@Injectable({ providedIn: 'root' })
export class MonitoringUsersService {
  private readonly api = inject(MonitoringApi);

  list(q: QueryParams): Observable<MonitoringPaged<MonitoringUser>> {
    return this.api.get('/users', q);
  }
  create(body: CreateMonitoringUserRequest): Observable<MonitoringUser> {
    return this.api.post('/users', body);
  }
  setRoles(id: number, roles: string[]): Observable<unknown> {
    return this.api.put(`/users/${id}/roles`, { roles });
  }
  activate(id: number): Observable<unknown> {
    return this.api.post(`/users/${id}/activate`);
  }
  deactivate(id: number): Observable<unknown> {
    return this.api.post(`/users/${id}/deactivate`);
  }
  unlock(id: number): Observable<unknown> {
    return this.api.post(`/users/${id}/unlock`);
  }
  revokeSessions(id: number): Observable<unknown> {
    return this.api.post(`/users/${id}/revoke-sessions`);
  }
  resetToken(id: number): Observable<ResetTokenResult> {
    return this.api.post(`/users/${id}/reset-token`);
  }
  roles(): Observable<MonitoringRoleInfo[]> {
    return this.api.get('/roles');
  }
  permissions(): Observable<MonitoringPermissionInfo[]> {
    return this.api.get('/permissions');
  }
  setRolePermissions(roleId: number, permissions: string[]): Observable<unknown> {
    return this.api.put(`/roles/${roleId}/permissions`, { permissions });
  }
}
