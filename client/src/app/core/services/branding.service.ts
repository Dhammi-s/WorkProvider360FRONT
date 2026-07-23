import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Branding } from '../models/branding.model';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/branding`;

  /** Cached agency logo (data URI) shared across the app so the sidebar updates live. */
  readonly logo = signal<string | null>(null);
  private loaded = false;

  /** Fetch once per session (call again with force to refresh). */
  load(force = false): void {
    if (this.loaded && !force) return;
    this.loaded = true;
    this.http
      .get<ApiResponse<Branding>>(this.baseUrl)
      .pipe(map((r) => r.data?.logoBase64 ?? null))
      .subscribe({
        next: (logo) => this.logo.set(logo),
        error: () => this.logo.set(null),
      });
  }

  get(): Observable<Branding> {
    return this.http.get<ApiResponse<Branding>>(this.baseUrl).pipe(map((r) => r.data ?? {}));
  }

  updateLogo(logoBase64: string): Observable<Branding> {
    return this.http
      .put<ApiResponse<Branding>>(`${this.baseUrl}/logo`, { logoBase64 })
      .pipe(
        map((r) => r.data ?? {}),
        tap((b) => this.logo.set(b.logoBase64 ?? null)),
      );
  }
}
