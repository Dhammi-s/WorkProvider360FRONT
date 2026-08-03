/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-08-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface AppNotification {
  notificationId: number;
  title?: string | null;
  message: string;
  isRead: boolean;
  createdByName?: string | null;
  createdOn: string;
}

/** In-app notifications: send (admin) + read own bell. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  send(userId: number, message: string, title?: string): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/send`, { userId, message, title })
      .pipe(map((r) => r.message ?? 'Notification sent.'));
  }

  mine(): Observable<AppNotification[]> {
    return this.http
      .get<ApiResponse<AppNotification[]>>(`${this.baseUrl}/mine`)
      .pipe(map((r) => r.data ?? []));
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(`${this.baseUrl}/unread-count`)
      .pipe(map((r) => r.data ?? 0));
  }

  markAllRead(): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/read-all`, {}).pipe(map(() => undefined));
  }
}
