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
  Aging,
  AgingGroupBy,
  BillingPage,
  CreatePaymentRequest,
  OpenInvoices,
  PaymentApplicationInput,
  PaymentApplied,
  PaymentCreated,
  PaymentDetail,
  PaymentListQuery,
  PaymentListRow,
  PaymentPlan,
  PaymentReport,
  PaymentReportGroupBy,
  PaymentReversed,
  RefundCreated,
  RefundRequest,
} from '../models/billing.model';
import { queryParams, unwrapData } from './billing-http';

/** Payments & AR: payments, applications, refunds, open invoices, aging and the payments report. */
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/billing/payments`;

  create(request: CreatePaymentRequest): Observable<PaymentCreated> {
    return this.http.post<ApiResponse<PaymentCreated>>(this.base, request).pipe(map((r) => unwrapData(r)));
  }

  list(q: PaymentListQuery = {}): Observable<BillingPage<PaymentListRow>> {
    const params = queryParams({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
      sourceType: q.sourceType,
      payerId: q.payerId,
      clientId: q.clientId,
      method: q.method,
      source: q.source,
      status: q.status,
      fromDate: q.fromDate,
      toDate: q.toDate,
      onlyUnapplied: q.onlyUnapplied ? 'true' : null,
      officeId: q.officeId,
      search: q.search,
    });
    return this.http
      .get<ApiResponse<BillingPage<PaymentListRow>>>(this.base, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  get(id: number): Observable<PaymentDetail> {
    return this.http.get<ApiResponse<PaymentDetail>>(`${this.base}/${id}`).pipe(map((r) => unwrapData(r)));
  }

  /** Planner: oldest due first, never above a balance. */
  propose(payerId: number | null, clientId: number | null, amount: number, lineLevel = false): Observable<PaymentPlan> {
    return this.http
      .post<ApiResponse<PaymentPlan>>(`${this.base}/propose`, { payerId, clientId, amount, lineLevel })
      .pipe(map((r) => unwrapData(r)));
  }

  /** Applies unapplied credit (applications null + autoApply = planner). */
  apply(id: number, applications: PaymentApplicationInput[] | null, autoApply: boolean): Observable<PaymentApplied> {
    return this.http
      .post<ApiResponse<PaymentApplied>>(`${this.base}/${id}/apply`, { applications, autoApply })
      .pipe(map((r) => unwrapData(r)));
  }

  /** SuperAdmin only. */
  reverse(id: number, reason: string): Observable<PaymentReversed> {
    return this.http
      .post<ApiResponse<PaymentReversed>>(`${this.base}/${id}/reverse`, { reason })
      .pipe(map((r) => unwrapData(r)));
  }

  refund(id: number, request: RefundRequest): Observable<RefundCreated> {
    return this.http
      .post<ApiResponse<RefundCreated>>(`${this.base}/${id}/refunds`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  openInvoices(payerId: number | null, clientId: number | null, asOf?: string | null): Observable<OpenInvoices> {
    const params = queryParams({ payerId, clientId, asOf });
    return this.http
      .get<ApiResponse<OpenInvoices>>(`${this.base}/open-invoices`, { params })
      .pipe(map((r) => r.data ?? { invoices: [], lines: [] }));
  }

  aging(asOf: string, groupBy: AgingGroupBy): Observable<Aging> {
    return this.http
      .get<ApiResponse<Aging>>(`${this.base}/aging`, { params: queryParams({ asOf, groupBy }) })
      .pipe(map((r) => unwrapData(r)));
  }

  report(from: string, to: string, groupBy: PaymentReportGroupBy): Observable<PaymentReport> {
    return this.http
      .get<ApiResponse<PaymentReport>>(`${this.base}/report`, { params: queryParams({ from, to, groupBy }) })
      .pipe(map((r) => unwrapData(r)));
  }
}
