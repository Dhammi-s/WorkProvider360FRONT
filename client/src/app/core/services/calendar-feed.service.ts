/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CalendarFeed } from '../models/calendar-feed.model';

const EMPTY: CalendarFeed = { enabled: false, url: null, createdOn: null, lastAccessOn: null };

/** The signed-in user's private calendar (.ics) feed. */
@Injectable({ providedIn: 'root' })
export class CalendarFeedService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/calendar/feed`;

  get(): Observable<CalendarFeed> {
    return this.http.get<ApiResponse<CalendarFeed>>(this.baseUrl).pipe(map((r) => r.data ?? EMPTY));
  }

  /** New link (shown only in this response); the old URL stops working. */
  regenerate(): Observable<CalendarFeed> {
    return this.http
      .post<ApiResponse<CalendarFeed>>(`${this.baseUrl}/regenerate`, {})
      .pipe(map((r) => r.data ?? EMPTY));
  }

  turnOff(): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(this.baseUrl)
      .pipe(map((r) => r.message ?? 'Calendar feed turned off.'));
  }
}
