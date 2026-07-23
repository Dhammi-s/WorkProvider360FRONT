import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { EmailLog, LogAccess, LogSettings, UpdateLogSettings } from '../models/log.model';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/logs`;

  access(): Observable<LogAccess> {
    return this.http
      .get<ApiResponse<LogAccess>>(`${this.baseUrl}/access`)
      .pipe(map((r) => this.unwrap(r)));
  }

  emails(top = 200): Observable<EmailLog[]> {
    const params = new HttpParams().set('top', top);
    return this.http
      .get<ApiResponse<EmailLog[]>>(`${this.baseUrl}/emails`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  getSettings(): Observable<LogSettings> {
    return this.http
      .get<ApiResponse<LogSettings>>(`${this.baseUrl}/settings`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpdateLogSettings): Observable<LogSettings> {
    return this.http
      .put<ApiResponse<LogSettings>>(`${this.baseUrl}/settings`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
