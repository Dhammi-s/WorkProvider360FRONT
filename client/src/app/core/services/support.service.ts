/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

/** Sends support messages to the backend, which emails the support inbox. */
@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/support`;

  send(subject: string, message: string): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(this.baseUrl, { subject, message })
      .pipe(map((res) => res.message ?? 'Message sent.'));
  }
}
