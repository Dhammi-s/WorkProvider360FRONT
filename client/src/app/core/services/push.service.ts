/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-04
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PushSettings, UpdatePushSettings } from '../models/push.model';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/push`;

  getSettings(): Observable<PushSettings> {
    return this.http.get<ApiResponse<PushSettings>>(`${this.baseUrl}/settings`).pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpdatePushSettings): Observable<PushSettings> {
    return this.http.put<ApiResponse<PushSettings>>(`${this.baseUrl}/settings`, request).pipe(map((r) => this.unwrap(r)));
  }

  /** Sends a test push to the signed-in user's own registered devices. */
  sendTest(): Observable<string> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/test`, {}).pipe(map((r) => r.message ?? 'Test push sent.'));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) throw new Error(res.message ?? 'Request failed.');
    return res.data;
  }
}
