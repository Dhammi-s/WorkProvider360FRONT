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
import { HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/paged-result.model';
import { RoleDto } from '../models/role.model';
import { CreateUserRequest, SendSmsRequest, UserDto } from '../models/user.model';

/** Reads/writes tenant users and roles (dashboard admin features). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiBaseUrl}/users`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/roles`;

  getUsers(): Observable<UserDto[]> {
    return this.http
      .get<ApiResponse<UserDto[]>>(this.usersUrl)
      .pipe(map((res) => res.data ?? []));
  }

  getUsersPaged(
    page = 1,
    pageSize = 10,
    filters?: { role?: string; officeId?: string; noOffice?: boolean },
  ): Observable<PagedResult<UserDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (filters?.role) params = params.set('role', filters.role);
    if (filters?.officeId) params = params.set('officeId', filters.officeId);
    if (filters?.noOffice) params = params.set('noOffice', true);
    return this.http
      .get<ApiResponse<PagedResult<UserDto>>>(`${this.usersUrl}/paged`, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page, pageSize }));
  }

  getMe(): Observable<UserDto> {
    return this.http
      .get<ApiResponse<UserDto>>(`${this.usersUrl}/me`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createUser(request: CreateUserRequest): Observable<UserDto> {
    return this.http
      .post<ApiResponse<UserDto>>(this.usersUrl, request)
      .pipe(map((res) => this.unwrap(res)));
  }

  /** Reset the user's password to a new temporary one and email it to them. */
  resendCredentials(userId: number): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.usersUrl}/${userId}/resend-credentials`, {})
      .pipe(map((res) => res.message ?? 'Credentials sent.'));
  }

  /** Resend credentials to multiple users at once. */
  resendCredentialsBulk(userIds: number[]): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.usersUrl}/resend-credentials`, { userIds })
      .pipe(map((res) => res.message ?? 'Credentials sent.'));
  }

  /** Upload the current user's cropped profile photo (base64 data URI) to Cloudinary. */
  uploadAvatar(imageBase64: string): Observable<UserDto> {
    return this.http
      .post<ApiResponse<UserDto>>(`${this.usersUrl}/me/avatar`, { imageBase64 })
      .pipe(map((res) => this.unwrap(res)));
  }

  /** Send an SMS to a user (by id, using their stored phone) or to an explicit number. */
  sendSms(request: SendSmsRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${environment.apiBaseUrl}/sms/send`, request)
      .pipe(map((res) => res.message ?? 'SMS sent.'));
  }

  /** Unlock a locked account (SuperAdmin always; Admin/Manager per tenant policy). */
  unlock(userId: number): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.usersUrl}/${userId}/unlock`, {})
      .pipe(map((res) => res.message ?? 'Account unlocked.'));
  }

  /** Whether Admins/Managers may unlock accounts in this tenant. */
  getAllowStaffUnlock(): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ allowStaffUnlock: boolean }>>(`${this.usersUrl}/security-policy`)
      .pipe(map((res) => res.data?.allowStaffUnlock ?? false));
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http
      .get<ApiResponse<RoleDto[]>>(this.rolesUrl)
      .pipe(map((res) => res.data ?? []));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
