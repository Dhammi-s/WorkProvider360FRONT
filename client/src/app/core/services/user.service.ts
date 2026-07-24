import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
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

  /** Send an SMS to a user (by id, using their stored phone) or to an explicit number. */
  sendSms(request: SendSmsRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${environment.apiBaseUrl}/sms/send`, request)
      .pipe(map((res) => res.message ?? 'SMS sent.'));
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
