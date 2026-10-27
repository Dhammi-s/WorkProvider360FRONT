/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ClientInvoice,
  ClientInvoiceDetail,
  ClientInvoicePreview,
  ClientInvoiceStatus,
  CreateClientInvoiceRequest,
} from '../models/client-invoice.model';

@Injectable({ providedIn: 'root' })
export class ClientInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/clientinvoices`;

  /** One client's invoices, or every invoice the caller can see when clientId is omitted. */
  list(clientId?: number): Observable<ClientInvoice[]> {
    const params: Record<string, string> = {};
    if (clientId != null) params['clientId'] = String(clientId);
    return this.http
      .get<ApiResponse<ClientInvoice[]>>(this.baseUrl, { params })
      .pipe(map((r) => r.data ?? []));
  }

  preview(clientId: number, fromUtc: string, toUtc: string): Observable<ClientInvoicePreview> {
    return this.http
      .get<ApiResponse<ClientInvoicePreview>>(`${this.baseUrl}/preview`, {
        params: { clientId: String(clientId), fromUtc, toUtc },
      })
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: CreateClientInvoiceRequest): Observable<ClientInvoice> {
    return this.http
      .post<ApiResponse<ClientInvoice>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  get(id: number): Observable<ClientInvoiceDetail> {
    return this.http
      .get<ApiResponse<ClientInvoiceDetail>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  setStatus(id: number, status: ClientInvoiceStatus): Observable<ClientInvoice> {
    return this.http
      .patch<ApiResponse<ClientInvoice>>(`${this.baseUrl}/${id}/status`, { status })
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
