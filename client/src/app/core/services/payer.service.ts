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
import { PagedResult } from '../models/paged-result.model';
import {
  Payer,
  PayerContact,
  PayerDetail,
  PayerLinkedClient,
  SavePayerContactRequest,
  SavePayerRequest,
} from '../models/payer.model';

export interface PayerListFilters {
  search?: string;
  officeId?: string;
  status?: string;
  payerType?: string;
}

/** Agency payer master (Payers page and payer detail). */
@Injectable({ providedIn: 'root' })
export class PayerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/payers`;

  list(page = 1, pageSize = 20, filters: PayerListFilters = {}): Observable<PagedResult<Payer>> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (filters.search) params['search'] = filters.search;
    if (filters.officeId) params['officeId'] = filters.officeId;
    if (filters.status) params['status'] = filters.status;
    if (filters.payerType) params['payerType'] = filters.payerType;
    return this.http
      .get<ApiResponse<PagedResult<Payer>>>(this.baseUrl, { params })
      .pipe(map((r) => this.unwrap(r)));
  }

  get(id: number): Observable<PayerDetail> {
    return this.http.get<ApiResponse<PayerDetail>>(`${this.baseUrl}/${id}`).pipe(map((r) => this.unwrap(r)));
  }

  create(request: SavePayerRequest): Observable<PayerDetail> {
    return this.http.post<ApiResponse<PayerDetail>>(this.baseUrl, request).pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: SavePayerRequest): Observable<PayerDetail> {
    return this.http.put<ApiResponse<PayerDetail>>(`${this.baseUrl}/${id}`, request).pipe(map((r) => this.unwrap(r)));
  }

  setStatus(id: number, status: 'Active' | 'Inactive'): Observable<PayerDetail> {
    return this.http
      .patch<ApiResponse<PayerDetail>>(`${this.baseUrl}/${id}/status`, { status })
      .pipe(map((r) => this.unwrap(r)));
  }

  linkedClients(id: number): Observable<PayerLinkedClient[]> {
    return this.http
      .get<ApiResponse<PayerLinkedClient[]>>(`${this.baseUrl}/${id}/clients`)
      .pipe(map((r) => r.data ?? []));
  }

  saveContact(payerId: number, contactId: number | null, request: SavePayerContactRequest): Observable<PayerContact[]> {
    const req$ = contactId
      ? this.http.put<ApiResponse<PayerContact[]>>(`${this.baseUrl}/${payerId}/contacts/${contactId}`, request)
      : this.http.post<ApiResponse<PayerContact[]>>(`${this.baseUrl}/${payerId}/contacts`, request);
    return req$.pipe(map((r) => r.data ?? []));
  }

  deleteContact(payerId: number, contactId: number): Observable<PayerContact[]> {
    return this.http
      .delete<ApiResponse<PayerContact[]>>(`${this.baseUrl}/${payerId}/contacts/${contactId}`)
      .pipe(map((r) => r.data ?? []));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
