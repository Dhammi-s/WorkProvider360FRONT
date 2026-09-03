/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { UserProfile, UpsertUserProfileRequest } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  getMine(): Observable<UserProfile> {
    return this.http
      .get<ApiResponse<UserProfile>>(`${this.baseUrl}/me/profile`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateMine(request: UpsertUserProfileRequest): Observable<UserProfile> {
    return this.http
      .put<ApiResponse<UserProfile>>(`${this.baseUrl}/me/profile`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  get(userId: number): Observable<UserProfile> {
    return this.http
      .get<ApiResponse<UserProfile>>(`${this.baseUrl}/${userId}/profile`)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(userId: number, request: UpsertUserProfileRequest): Observable<UserProfile> {
    return this.http
      .put<ApiResponse<UserProfile>>(`${this.baseUrl}/${userId}/profile`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
