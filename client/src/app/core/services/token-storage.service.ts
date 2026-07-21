import { Injectable } from '@angular/core';
import { AuthResponse, SessionUser } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'wp360.accessToken';
const REFRESH_TOKEN_KEY = 'wp360.refreshToken';
const EXPIRES_KEY = 'wp360.expiresOn';
const USER_KEY = 'wp360.user';
/** Records which Storage the session lives in, so we can find it after reload. */
const PERSIST_KEY = 'wp360.persistent';

/**
 * Reads/writes the auth session. Uses localStorage when "remember me" is on
 * (survives browser restart) and sessionStorage otherwise (cleared on close).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private get store(): Storage {
    return localStorage.getItem(PERSIST_KEY) === 'true' ? localStorage : sessionStorage;
  }

  save(auth: AuthResponse, remember: boolean): void {
    // Clear any prior session in the other storage first.
    this.clear();
    localStorage.setItem(PERSIST_KEY, String(remember));

    const store = this.store;
    store.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
    store.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    store.setItem(EXPIRES_KEY, auth.accessTokenExpiresOn);
    store.setItem(USER_KEY, JSON.stringify(this.toSessionUser(auth)));
  }

  /** Update just the tokens after a silent refresh (keeps the same storage). */
  updateTokens(auth: AuthResponse): void {
    const store = this.store;
    store.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
    store.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
    store.setItem(EXPIRES_KEY, auth.accessTokenExpiresOn);
    store.setItem(USER_KEY, JSON.stringify(this.toSessionUser(auth)));
  }

  get accessToken(): string | null {
    return this.store.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return this.store.getItem(REFRESH_TOKEN_KEY);
  }

  get user(): SessionUser | null {
    const raw = this.store.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  clear(): void {
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem(ACCESS_TOKEN_KEY);
      s.removeItem(REFRESH_TOKEN_KEY);
      s.removeItem(EXPIRES_KEY);
      s.removeItem(USER_KEY);
    }
    localStorage.removeItem(PERSIST_KEY);
  }

  private toSessionUser(auth: AuthResponse): SessionUser {
    return {
      agencyId: auth.agencyId,
      userId: auth.userId,
      email: auth.email,
      fullName: auth.fullName,
      roleId: auth.roleId,
      roleName: auth.roleName,
    };
  }
}
