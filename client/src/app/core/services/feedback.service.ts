/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-29
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CaregiverFeedback, VisitFeedback } from '../models/feedback.model';

/** Staff view of client feedback (schedule Feedback tab, caregiver profile). */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/feedback`;

  /** The client's feedback on a schedule, or null when none was given. */
  forSchedule(scheduleId: number): Observable<VisitFeedback | null> {
    return this.http
      .get<ApiResponse<VisitFeedback | null>>(`${this.baseUrl}/schedule/${scheduleId}`)
      .pipe(map((r) => r.data ?? null));
  }

  forCaregiver(userId: number, page = 1, pageSize = 20): Observable<CaregiverFeedback> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http
      .get<ApiResponse<CaregiverFeedback>>(`${this.baseUrl}/caregiver/${userId}`, { params })
      .pipe(
        map((r) => {
          if (!r.success || !r.data) throw new Error(r.message ?? 'Could not load feedback.');
          return r.data;
        }),
      );
  }
}
