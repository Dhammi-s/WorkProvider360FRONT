import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { SecurityStats } from '../models/security.model';

/** Reads the tenant security-audit dashboard data (SuperAdmin only). */
@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/security`;

  getStats(take = 200): Observable<SecurityStats> {
    return this.http
      .get<ApiResponse<SecurityStats>>(`${this.baseUrl}/stats?take=${take}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
