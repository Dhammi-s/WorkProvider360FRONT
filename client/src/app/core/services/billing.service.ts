/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AdjustmentResult,
  BillingAccess,
  BillingPage,
  ClientDiagnosis,
  ClientDiagnosisInput,
  CreateAdjustmentRequest,
  FinalizeResult,
  InvoiceDetail,
  InvoiceDraftDeleted,
  InvoiceLineRemoved,
  InvoiceListQuery,
  InvoiceListRow,
  InvoiceRun,
  InvoiceRunCreated,
  InvoiceRunDetail,
  InvoiceRunDiscard,
  InvoiceRunPreview,
  InvoiceRunRequest,
  InvoiceSendResult,
  InvoiceVoided,
  Statement,
  StatementQuery,
} from '../models/billing.model';
import { PagedResult } from '../models/paged-result.model';
import { AuthService } from './auth.service';
import { queryParams, unwrapData } from './billing-http';

/**
 * Billing: access, invoices (lifecycle, PDF, send, adjustments), invoice runs,
 * statements and client diagnoses.
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiBaseUrl}/billing`;

  // ------------------------------------------------------------------ Access

  /** The signed-in user's billing access; null until loaded (or when the call failed). */
  readonly access = signal<BillingAccess | null>(null);
  readonly canView = computed(() => !!this.access()?.canView && this.access()?.accessLevel !== 'None');
  readonly canManage = computed(() => !!this.access()?.canManage);
  readonly canManageSettings = computed(() => !!this.access()?.canManageSettings);
  private access$: Observable<BillingAccess | null> | null = null;
  private accessUserId: number | null = null;

  /** Loads the access once per signed-in user (Staff only); errors resolve to null. */
  loadAccess(force = false): Observable<BillingAccess | null> {
    const userId = this.auth.user()?.userId ?? null;
    if (force || !this.access$ || this.accessUserId !== userId) {
      this.accessUserId = userId;
      this.access$ = this.http.get<ApiResponse<BillingAccess>>(`${this.base}/settings/access`).pipe(
        map((r) => unwrapData(r)),
        tap((a) => this.access.set(a)),
        catchError(() => {
          this.access$ = null;
          this.access.set(null);
          return of(null);
        }),
        shareReplay(1),
      );
    }
    return this.access$;
  }

  // ------------------------------------------------------------------ Invoices

  invoices(q: InvoiceListQuery = {}): Observable<BillingPage<InvoiceListRow>> {
    const params = queryParams({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
      status: q.status,
      clientId: q.clientId,
      payerId: q.payerId,
      billToType: q.billToType,
      runId: q.runId,
      officeId: q.officeId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      onlyOpen: q.onlyOpen ? 'true' : null,
      overdueAsOf: q.overdueAsOf,
      search: q.search,
    });
    return this.http
      .get<ApiResponse<BillingPage<InvoiceListRow>>>(`${this.base}/invoices`, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  invoice(id: number): Observable<InvoiceDetail> {
    return this.http.get<ApiResponse<InvoiceDetail>>(`${this.base}/invoices/${id}`).pipe(map((r) => unwrapData(r)));
  }

  /** Server-rendered invoice PDF. */
  invoicePdf(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/invoices/${id}/pdf`, { responseType: 'blob', observe: 'response' });
  }

  finalizeMany(invoiceIds: number[]): Observable<FinalizeResult> {
    return this.http
      .post<ApiResponse<FinalizeResult>>(`${this.base}/invoices/finalize`, { invoiceIds })
      .pipe(map((r) => unwrapData(r)));
  }

  finalize(id: number): Observable<FinalizeResult> {
    return this.http
      .post<ApiResponse<FinalizeResult>>(`${this.base}/invoices/${id}/finalize`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  /** 409 when payments / adjustments are active. */
  voidInvoice(id: number, reason: string): Observable<InvoiceVoided> {
    return this.http
      .post<ApiResponse<InvoiceVoided>>(`${this.base}/invoices/${id}/void`, { reason })
      .pipe(map((r) => unwrapData(r)));
  }

  /** toEmail null = the bill-to email. */
  send(id: number, toEmail: string | null, message: string | null): Observable<InvoiceSendResult> {
    return this.http
      .post<ApiResponse<InvoiceSendResult>>(`${this.base}/invoices/${id}/send`, { toEmail, message })
      .pipe(map((r) => unwrapData(r)));
  }

  deleteDraft(id: number): Observable<InvoiceDraftDeleted> {
    return this.http
      .delete<ApiResponse<InvoiceDraftDeleted>>(`${this.base}/invoices/${id}`)
      .pipe(map((r) => unwrapData(r)));
  }

  removeDraftLine(id: number, lineId: number): Observable<InvoiceLineRemoved> {
    return this.http
      .delete<ApiResponse<InvoiceLineRemoved>>(`${this.base}/invoices/${id}/lines/${lineId}`)
      .pipe(map((r) => unwrapData(r)));
  }

  adjust(id: number, request: CreateAdjustmentRequest): Observable<AdjustmentResult> {
    return this.http
      .post<ApiResponse<AdjustmentResult>>(`${this.base}/invoices/${id}/adjustments`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  reverseAdjustment(id: number, adjustmentId: number): Observable<AdjustmentResult> {
    return this.http
      .post<ApiResponse<AdjustmentResult>>(`${this.base}/invoices/${id}/adjustments/${adjustmentId}/reverse`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Invoice runs

  previewRun(request: InvoiceRunRequest): Observable<InvoiceRunPreview> {
    return this.http
      .post<ApiResponse<InvoiceRunPreview>>(`${this.base}/runs/preview`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  createRun(request: InvoiceRunRequest): Observable<InvoiceRunCreated> {
    return this.http
      .post<ApiResponse<InvoiceRunCreated>>(`${this.base}/runs`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  runs(page = 1, pageSize = 20, status?: string | null, officeId?: string | null): Observable<PagedResult<InvoiceRun>> {
    const params = queryParams({ page, pageSize, status, officeId });
    return this.http
      .get<ApiResponse<PagedResult<InvoiceRun>>>(`${this.base}/runs`, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  run(id: number): Observable<InvoiceRunDetail> {
    return this.http.get<ApiResponse<InvoiceRunDetail>>(`${this.base}/runs/${id}`).pipe(map((r) => unwrapData(r)));
  }

  /** Finalizes every remaining draft of the run. */
  finalizeRun(id: number): Observable<FinalizeResult> {
    return this.http
      .post<ApiResponse<FinalizeResult>>(`${this.base}/runs/${id}/finalize`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  /** Deletes the run's remaining drafts. */
  discardRun(id: number): Observable<InvoiceRunDiscard> {
    return this.http
      .delete<ApiResponse<InvoiceRunDiscard>>(`${this.base}/runs/${id}`)
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Statements

  statement(q: StatementQuery): Observable<Statement> {
    const params = queryParams({ clientId: q.clientId, payerId: q.payerId, asOf: q.asOf });
    return this.http
      .get<ApiResponse<Statement>>(`${this.base}/statements`, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  statementPdf(q: StatementQuery): Observable<HttpResponse<Blob>> {
    const params = queryParams({ clientId: q.clientId, payerId: q.payerId, asOf: q.asOf });
    return this.http.get(`${this.base}/statements/pdf`, { params, responseType: 'blob', observe: 'response' });
  }

  sendStatement(q: StatementQuery, toEmail: string | null): Observable<InvoiceSendResult> {
    return this.http
      .post<ApiResponse<InvoiceSendResult>>(`${this.base}/statements/send`, {
        clientId: q.clientId ?? null,
        payerId: q.payerId ?? null,
        asOf: q.asOf ?? null,
        toEmail,
      })
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Client diagnoses

  diagnoses(clientId: number, currentOnly = false): Observable<ClientDiagnosis[]> {
    const params = queryParams({ currentOnly: currentOnly ? 'true' : null });
    return this.http
      .get<ApiResponse<ClientDiagnosis[]>>(`${environment.apiBaseUrl}/clients/${clientId}/diagnoses`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  /** Replaces the whole list (≤ 12 current, one primary). */
  saveDiagnoses(clientId: number, diagnoses: ClientDiagnosisInput[]): Observable<ClientDiagnosis[]> {
    return this.http
      .put<ApiResponse<ClientDiagnosis[]>>(`${environment.apiBaseUrl}/clients/${clientId}/diagnoses`, { diagnoses })
      .pipe(map((r) => r.data ?? []));
  }
}
