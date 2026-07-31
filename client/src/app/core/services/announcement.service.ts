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
import {
  Announcement,
  AnnouncementSettings,
  AnnouncementView,
  CreateAnnouncement,
  UpdateAnnouncementSettings,
} from '../models/announcement.model';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/announcements`;

  getView(): Observable<AnnouncementView> {
    return this.http
      .get<ApiResponse<AnnouncementView>>(this.baseUrl)
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: CreateAnnouncement): Observable<Announcement> {
    return this.http
      .post<ApiResponse<Announcement>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  deactivate(id: string): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.message ?? 'Removed.'));
  }

  getSettings(): Observable<AnnouncementSettings> {
    return this.http
      .get<ApiResponse<AnnouncementSettings>>(`${this.baseUrl}/settings`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpdateAnnouncementSettings): Observable<AnnouncementSettings> {
    return this.http
      .put<ApiResponse<AnnouncementSettings>>(`${this.baseUrl}/settings`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
