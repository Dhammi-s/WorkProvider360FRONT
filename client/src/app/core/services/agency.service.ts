import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface AgencyInfo {
  agencyId: number;
  agencyName: string;
  location?: string | null;
}

/** Exposes the current tenant's display name for the app shell. */
@Injectable({ providedIn: 'root' })
export class AgencyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/agency`;

  /** Cached agency name, shared across the app. */
  readonly name = signal<string>('');

  load(): void {
    this.http.get<ApiResponse<AgencyInfo>>(`${this.baseUrl}/me`).subscribe({
      next: (res) => {
        if (res.success && res.data?.agencyName) this.name.set(res.data.agencyName);
      },
      error: () => {},
    });
  }
}
