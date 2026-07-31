/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthResponse,
  BootstrapAdminRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  ResetPasswordRequest,
  SessionUser,
} from '../models/auth.model';
import { RoleName } from '../models/role.model';
import { UserDto } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly usersUrl = `${environment.apiBaseUrl}/users`;

  /** Reactive current user, hydrated from storage on startup. */
  private readonly _user = signal<SessionUser | null>(this.storage.user);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly roleName = computed<RoleName | null>(
    () => (this._user()?.roleName as RoleName) ?? null,
  );

  login(request: LoginRequest, remember: boolean): Observable<SessionUser> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, request).pipe(
      map((res) => this.unwrap(res)),
      tap((auth) => {
        this.storage.save(auth, remember);
        this._user.set(this.storage.user);
      }),
      map(() => this._user()!),
    );
  }

  /** Register = create the first SuperAdmin for the tenant. */
  bootstrapAdmin(request: BootstrapAdminRequest): Observable<UserDto> {
    return this.http
      .post<ApiResponse<UserDto>>(`${this.usersUrl}/bootstrap-admin`, request)
      .pipe(map((res) => this.unwrap(res)));
  }

  /** Public self-registration — always creates a "User" role account. */
  register(request: BootstrapAdminRequest): Observable<UserDto> {
    return this.http
      .post<ApiResponse<UserDto>>(`${this.usersUrl}/register`, request)
      .pipe(map((res) => this.unwrap(res)));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/forgot-password`, request)
      .pipe(map((res) => res.message ?? 'If the email is registered, a reset link has been sent.'));
  }

  resetPassword(request: ResetPasswordRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/reset-password`, request)
      .pipe(map((res) => res.message ?? 'Password has been reset. Please sign in.'));
  }

  changePassword(request: ChangePasswordRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/change-password`, request)
      .pipe(map((res) => res.message ?? 'Password changed successfully.'));
  }

  refreshToken(): Observable<AuthResponse> {
    const body: RefreshTokenRequest = {
      accessToken: this.storage.accessToken ?? '',
      refreshToken: this.storage.refreshToken ?? '',
    };
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/refresh-token`, body).pipe(
      map((res) => this.unwrap(res)),
      tap((auth) => {
        this.storage.updateTokens(auth);
        this._user.set(this.storage.user);
      }),
    );
  }

  me(): Observable<UserDto> {
    return this.http
      .get<ApiResponse<UserDto>>(`${this.usersUrl}/me`)
      .pipe(map((res) => this.unwrap(res)));
  }

  /** Best-effort server logout, then always clear the local session. */
  logout(): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/logout`, {}).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      }),
    );
  }

  clearSession(): void {
    this.storage.clear();
    this._user.set(null);
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
