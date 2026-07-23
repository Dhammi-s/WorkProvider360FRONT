import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  PosChargeRequest,
  PosFeeSettings,
  PosSummary,
  PosTransaction,
} from '../models/pos.model';

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/pos`;

  charge(request: PosChargeRequest): Observable<PosTransaction> {
    return this.http
      .post<ApiResponse<PosTransaction>>(`${this.baseUrl}/charge`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  transactions(): Observable<PosTransaction[]> {
    return this.http
      .get<ApiResponse<PosTransaction[]>>(`${this.baseUrl}/transactions`)
      .pipe(map((r) => r.data ?? []));
  }

  summary(): Observable<PosSummary> {
    return this.http
      .get<ApiResponse<PosSummary>>(`${this.baseUrl}/summary`)
      .pipe(map((r) => this.unwrap(r)));
  }

  getFeeSettings(): Observable<PosFeeSettings> {
    return this.http
      .get<ApiResponse<PosFeeSettings>>(`${this.baseUrl}/fee-settings`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateFeeSettings(feePercent: number, feeFixed: number): Observable<PosFeeSettings> {
    return this.http
      .put<ApiResponse<PosFeeSettings>>(`${this.baseUrl}/fee-settings`, { feePercent, feeFixed })
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
