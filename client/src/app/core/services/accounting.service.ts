/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  CheckoutRequest,
  CheckoutSession,
  Invoice,
  PayInvoiceRequest,
} from '../models/accounting.model';

@Injectable({ providedIn: 'root' })
export class AccountingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/invoices`;

  pay(request: PayInvoiceRequest): Observable<Invoice> {
    return this.http
      .post<ApiResponse<Invoice>>(`${this.baseUrl}/pay`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  createCheckoutSession(request: CheckoutRequest): Observable<CheckoutSession> {
    return this.http
      .post<ApiResponse<CheckoutSession>>(`${this.baseUrl}/checkout-session`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  list(): Observable<Invoice[]> {
    return this.http.get<ApiResponse<Invoice[]>>(this.baseUrl).pipe(map((r) => r.data ?? []));
  }

  pdf(invoiceId: string): Observable<string> {
    return this.http
      .get<ApiResponse<string>>(`${this.baseUrl}/${invoiceId}/pdf`)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
