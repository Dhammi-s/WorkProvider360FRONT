import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface ComplianceInfo {
  country: string;
  countryName: string;
  framework: string;
  submissionAvailable: boolean;
  description: string;
  isEnabled: boolean;
  providerOptions: string[];
}

export interface ComplianceSettings {
  isEnabled: boolean;
  providerKey: string;
  stateCode?: string | null;
  endpointUrl?: string | null;
  accountId?: string | null;
  hasApiKey: boolean;
}

export interface UpdateComplianceSettings {
  isEnabled: boolean;
  providerKey: string;
  stateCode?: string | null;
  endpointUrl?: string | null;
  accountId?: string | null;
  apiKey?: string | null;
}

export interface EvvVisit {
  timeEntryId: number;
  scheduleId: number;
  serviceName?: string | null;
  clientName?: string | null;
  clientMemberId?: string | null;
  payerName?: string | null;
  serviceLocation?: string | null;
  caregiverName: string;
  clockInUtc: string;
  clockOutUtc?: string | null;
  hours: number;
  billAmount: number;
  payAmount: number;
  hasGps: boolean;
  submissionStatus?: string | null;
  submissionLastAttemptOn?: string | null;
  submissionResponse?: string | null;
}

export interface EvvSubmitResult {
  timeEntryId: number;
  success: boolean;
  message: string;
}

export type ComplianceReportType = 'evv-visits' | 'schedule-details' | 'billing-summary';

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/compliance`;

  info(): Observable<ComplianceInfo> {
    return this.http.get<ApiResponse<ComplianceInfo>>(`${this.baseUrl}/info`).pipe(map((r) => r.data as ComplianceInfo));
  }

  settings(): Observable<ComplianceSettings> {
    return this.http.get<ApiResponse<ComplianceSettings>>(`${this.baseUrl}/settings`).pipe(map((r) => r.data as ComplianceSettings));
  }

  saveSettings(body: UpdateComplianceSettings): Observable<ComplianceSettings> {
    return this.http.put<ApiResponse<ComplianceSettings>>(`${this.baseUrl}/settings`, body).pipe(map((r) => r.data as ComplianceSettings));
  }

  visits(from: string, to: string): Observable<EvvVisit[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<EvvVisit[]>>(`${this.baseUrl}/visits`, { params }).pipe(map((r) => r.data ?? []));
  }

  submit(timeEntryIds: number[]): Observable<{ results: EvvSubmitResult[]; message: string }> {
    return this.http
      .post<ApiResponse<EvvSubmitResult[]>>(`${this.baseUrl}/submit`, { timeEntryIds })
      .pipe(map((r) => ({ results: r.data ?? [], message: r.message ?? '' })));
  }

  /** Downloads a CSV report through the authenticated HttpClient and saves it. */
  downloadReport(type: ComplianceReportType, from: string, to: string): Observable<void> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(`${this.baseUrl}/reports/${type}`, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((res) => {
        const cd = res.headers.get('content-disposition') ?? '';
        const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ?? `${type}.csv`;
        const url = URL.createObjectURL(res.body as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = decodeURIComponent(name);
        a.click();
        URL.revokeObjectURL(url);
      }),
    );
  }
}
