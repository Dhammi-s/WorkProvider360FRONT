/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { TrainingAuthResponse, TrainingSessionUser } from '../models/training.model';

const TOKEN_KEY = 'wp360.training.accessToken';
const EXPIRES_KEY = 'wp360.training.expiresOn';
const USER_KEY = 'wp360.training.user';

/**
 * The training portal's own session. Kept under separate storage keys from the
 * main app (wp360.accessToken...), so signing in / out of one never touches the
 * other. Training tokens have no refresh token: when one expires the user signs
 * in again (or re-opens the portal from the main app's Training tab).
 */
@Injectable({ providedIn: 'root' })
export class TrainingSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/training-auth`;

  private readonly _user = signal<TrainingSessionUser | null>(this.readUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user() && !this.isExpired());

  get accessToken(): string | null {
    return this.isExpired() ? null : localStorage.getItem(TOKEN_KEY);
  }

  /** Direct sign-in with the training username + password. */
  login(username: string, password: string): Observable<TrainingSessionUser> {
    return this.http
      .post<ApiResponse<TrainingAuthResponse>>(`${this.baseUrl}/login`, { username, password })
      .pipe(map((r) => this.save(r)));
  }

  /** Main-app Training tab: exchange the main session for a training session. */
  singleSignOn(): Observable<TrainingSessionUser> {
    return this.http
      .post<ApiResponse<TrainingAuthResponse>>(`${this.baseUrl}/sso`, {})
      .pipe(map((r) => this.save(r)));
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  private save(res: ApiResponse<TrainingAuthResponse>): TrainingSessionUser {
    const a = res.data;
    if (!res.success || !a) throw new Error(res.message ?? 'Training sign-in failed.');
    const user: TrainingSessionUser = {
      agencyId: a.agencyId,
      userId: a.userId,
      email: a.email,
      fullName: a.fullName,
      roleId: a.roleId,
      roleName: a.roleName,
      username: a.username,
    };
    localStorage.setItem(TOKEN_KEY, a.accessToken);
    localStorage.setItem(EXPIRES_KEY, a.accessTokenExpiresOn);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
    return user;
  }

  private isExpired(): boolean {
    const raw = localStorage.getItem(EXPIRES_KEY);
    return !raw || new Date(raw).getTime() <= Date.now();
  }

  private readUser(): TrainingSessionUser | null {
    if (this.isExpired()) return null;
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as TrainingSessionUser) : null;
    } catch {
      return null;
    }
  }
}
