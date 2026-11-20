/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { BillingPage } from '../models/billing.model';
import {
  ClaimBatchResult,
  ClaimCreateResult,
  ClaimDetail,
  ClaimListQuery,
  ClaimListRow,
  ClaimStatusResult,
  ClaimValidationResult,
  EdiImportResult,
  InboundPollResult,
  ManualMatchRequest,
  RemittanceDetail,
  RemittanceListQuery,
  RemittanceListRow,
  RemittanceMatchRow,
  RemittancePostResult,
  SetClaimStatusRequest,
  Submission,
  SubmissionDetail,
  SubmissionUploaded,
} from '../models/claims.model';
import { PagedResult } from '../models/paged-result.model';
import { queryParams, unwrapData } from './billing-http';

/** Electronic claims, claim batches (837P) and inbound EDI / remittances (999, 277CA, 835). */
@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/billing/claims`;
  private readonly remitBase = `${environment.apiBaseUrl}/billing/remittances`;

  // ------------------------------------------------------------------ Claims

  list(q: ClaimListQuery = {}): Observable<BillingPage<ClaimListRow>> {
    const params = queryParams({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
      status: q.status,
      workQueue: q.workQueue ? 'true' : null,
      payerId: q.payerId,
      clientId: q.clientId,
      invoiceId: q.invoiceId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      officeId: q.officeId,
      search: q.search,
    });
    return this.http
      .get<ApiResponse<BillingPage<ClaimListRow>>>(this.base, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  get(id: number): Observable<ClaimDetail> {
    return this.http.get<ApiResponse<ClaimDetail>>(`${this.base}/${id}`).pipe(map((r) => unwrapData(r)));
  }

  createFromInvoices(invoiceIds: number[]): Observable<ClaimCreateResult> {
    return this.http
      .post<ApiResponse<ClaimCreateResult>>(`${this.base}/from-invoices`, { invoiceIds })
      .pipe(map((r) => unwrapData(r)));
  }

  /** Valid claims become Ready. */
  validate(claimIds: number[]): Observable<ClaimValidationResult[]> {
    return this.http
      .post<ApiResponse<ClaimValidationResult[]>>(`${this.base}/validate`, { claimIds })
      .pipe(map((r) => r.data ?? []));
  }

  /** All claims must be Ready. */
  generateBatch(claimIds: number[]): Observable<ClaimBatchResult> {
    return this.http
      .post<ApiResponse<ClaimBatchResult>>(`${this.base}/batches`, { claimIds })
      .pipe(map((r) => unwrapData(r)));
  }

  batches(page = 1, pageSize = 20, status?: string | null): Observable<BillingPage<Submission>> {
    return this.http
      .get<ApiResponse<BillingPage<Submission>>>(`${this.base}/batches`, { params: queryParams({ page, pageSize, status }) })
      .pipe(map((r) => unwrapData(r)));
  }

  batch(id: number): Observable<SubmissionDetail> {
    return this.http.get<ApiResponse<SubmissionDetail>>(`${this.base}/batches/${id}`).pipe(map((r) => unwrapData(r)));
  }

  /** X12 file (PHI). Download transport → the batch becomes Uploaded. */
  batchFile(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/batches/${id}/file`, { responseType: 'blob', observe: 'response' });
  }

  /** SFTP upload now. */
  uploadBatch(id: number): Observable<SubmissionUploaded> {
    return this.http
      .post<ApiResponse<SubmissionUploaded>>(`${this.base}/batches/${id}/upload`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  /** Frequency 7 (needs the payer control number). Returns the new claim. */
  replacement(id: number): Observable<ClaimValidationResult> {
    return this.http
      .post<ApiResponse<ClaimValidationResult>>(`${this.base}/${id}/replacement`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  /** Frequency 8, or a local void before acceptance. */
  voidClaim(id: number): Observable<ClaimValidationResult> {
    return this.http
      .post<ApiResponse<ClaimValidationResult>>(`${this.base}/${id}/void`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  setStatus(id: number, request: SetClaimStatusRequest): Observable<ClaimStatusResult> {
    return this.http
      .patch<ApiResponse<ClaimStatusResult>>(`${this.base}/${id}/status`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Remittances & EDI files

  /** 999, 277CA or 835 file (≤ 20 MB). */
  upload(file: File): Observable<EdiImportResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<ApiResponse<EdiImportResult>>(`${this.remitBase}/upload`, form)
      .pipe(map((r) => unwrapData(r)));
  }

  /** SFTP inbound poll now. */
  poll(): Observable<InboundPollResult> {
    return this.http
      .post<ApiResponse<InboundPollResult>>(`${this.remitBase}/poll`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  remittances(q: RemittanceListQuery = {}): Observable<PagedResult<RemittanceListRow>> {
    const params = queryParams({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
      status: q.status,
      payerId: q.payerId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      search: q.search,
    });
    return this.http
      .get<ApiResponse<PagedResult<RemittanceListRow>>>(this.remitBase, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  remittance(id: number): Observable<RemittanceDetail> {
    return this.http.get<ApiResponse<RemittanceDetail>>(`${this.remitBase}/${id}`).pipe(map((r) => unwrapData(r)));
  }

  /** Strict re-match of the whole remittance. */
  rematch(id: number): Observable<RemittanceMatchRow[]> {
    return this.http
      .post<ApiResponse<RemittanceMatchRow[]>>(`${this.remitBase}/${id}/match`, {})
      .pipe(map((r) => r.data ?? []));
  }

  manualMatch(remittanceClaimId: number, request: ManualMatchRequest): Observable<RemittanceMatchRow[]> {
    return this.http
      .post<ApiResponse<RemittanceMatchRow[]>>(`${this.remitBase}/claims/${remittanceClaimId}/match`, request)
      .pipe(map((r) => r.data ?? []));
  }

  /** remittanceClaimIds null = all matched, not posted. */
  post(id: number, remittanceClaimIds: number[] | null): Observable<RemittancePostResult> {
    return this.http
      .post<ApiResponse<RemittancePostResult>>(`${this.remitBase}/${id}/post`, { remittanceClaimIds })
      .pipe(map((r) => unwrapData(r)));
  }
}
