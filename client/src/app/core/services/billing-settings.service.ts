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
  AccountingFailure,
  AuthorizationModifiers,
  BillingCode,
  BillingPage,
  BillingSettings,
  ClearinghouseSettings,
  OAuthUrl,
  PayerClaimRules,
  PayerClaimRulesBase,
  PayerEdi,
  PayerEdiDetail,
  QboItem,
  QboItemMapRow,
  SaveBillingCodeRequest,
  UpdateBillingAccessRequest,
  UpdateBillingSettingsRequest,
  UpdateClearinghouseRequest,
  UpdateEligibilitySettingsRequest,
  UpdatePayerEdiRequest,
  UserNpi,
} from '../models/billing.model';
import { queryParams, unwrapData, unwrapOptional } from './billing-http';

/** Settings ▸ Billing (SuperAdmin writes; billing Read can view). */
@Injectable({ providedIn: 'root' })
export class BillingSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/billing/settings`;

  get(): Observable<BillingSettings> {
    return this.http.get<ApiResponse<BillingSettings>>(this.base).pipe(map((r) => unwrapData(r)));
  }

  update(request: UpdateBillingSettingsRequest): Observable<BillingSettings> {
    return this.http.put<ApiResponse<BillingSettings>>(this.base, request).pipe(map((r) => unwrapData(r)));
  }

  updateAccess(request: UpdateBillingAccessRequest): Observable<BillingSettings> {
    return this.http.put<ApiResponse<BillingSettings>>(`${this.base}/access`, request).pipe(map((r) => unwrapData(r)));
  }

  updateEligibility(request: UpdateEligibilitySettingsRequest): Observable<BillingSettings> {
    return this.http
      .put<ApiResponse<BillingSettings>>(`${this.base}/eligibility`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Clearinghouse

  clearinghouse(): Observable<ClearinghouseSettings> {
    return this.http
      .get<ApiResponse<ClearinghouseSettings>>(`${this.base}/clearinghouse`)
      .pipe(map((r) => unwrapData(r)));
  }

  updateClearinghouse(request: UpdateClearinghouseRequest): Observable<ClearinghouseSettings> {
    return this.http
      .put<ApiResponse<ClearinghouseSettings>>(`${this.base}/clearinghouse`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Billing codes

  codes(serviceTypeId?: number | null, payerId?: number | null, includeInactive = false): Observable<BillingCode[]> {
    const params = queryParams({ serviceTypeId, payerId, includeInactive: includeInactive ? 'true' : null });
    return this.http
      .get<ApiResponse<BillingCode[]>>(`${this.base}/codes`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  createCode(request: SaveBillingCodeRequest): Observable<BillingCode> {
    return this.http.post<ApiResponse<BillingCode>>(`${this.base}/codes`, request).pipe(map((r) => unwrapData(r)));
  }

  updateCode(id: number, request: SaveBillingCodeRequest): Observable<BillingCode> {
    return this.http.put<ApiResponse<BillingCode>>(`${this.base}/codes/${id}`, request).pipe(map((r) => unwrapData(r)));
  }

  /** Deactivates the code. */
  deleteCode(id: number): Observable<null> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/codes/${id}`).pipe(map((r) => unwrapOptional(r)));
  }

  // ------------------------------------------------------------------ Payer EDI / claim rules

  /** Payer EDI fields + claim rules (null = defaults). */
  payerEdi(payerId: number): Observable<PayerEdiDetail> {
    return this.http
      .get<ApiResponse<PayerEdiDetail>>(`${this.base}/payers/${payerId}/edi`)
      .pipe(map((r) => unwrapData(r)));
  }

  updatePayerEdi(payerId: number, request: UpdatePayerEdiRequest): Observable<PayerEdi> {
    return this.http
      .put<ApiResponse<PayerEdi>>(`${this.base}/payers/${payerId}/edi`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  claimRules(payerId: number): Observable<PayerClaimRules> {
    return this.http
      .get<ApiResponse<PayerClaimRules>>(`${this.base}/payers/${payerId}/claim-rules`)
      .pipe(map((r) => unwrapData(r)));
  }

  updateClaimRules(payerId: number, request: PayerClaimRulesBase): Observable<PayerClaimRules> {
    return this.http
      .put<ApiResponse<PayerClaimRules>>(`${this.base}/payers/${payerId}/claim-rules`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  updateAuthorizationModifiers(
    authorizationId: number,
    request: Omit<AuthorizationModifiers, 'authorizationId'>,
  ): Observable<AuthorizationModifiers> {
    return this.http
      .put<ApiResponse<AuthorizationModifiers>>(`${this.base}/authorizations/${authorizationId}/modifiers`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  updateUserNpi(userId: number, npi: string | null): Observable<UserNpi> {
    return this.http
      .put<ApiResponse<UserNpi>>(`${this.base}/users/${userId}/npi`, { npi })
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Stripe Connect

  /** OAuth URL; after Stripe the browser lands on returnUrl?stripe=connected|cancelled. */
  stripeConnectUrl(returnUrl: string): Observable<OAuthUrl> {
    return this.http
      .get<ApiResponse<OAuthUrl>>(`${this.base}/stripe/connect-url`, { params: { returnUrl } })
      .pipe(map((r) => unwrapData(r)));
  }

  stripeDisconnect(): Observable<BillingSettings> {
    return this.http
      .post<ApiResponse<BillingSettings>>(`${this.base}/stripe/disconnect`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  stripeEnabled(enabled: boolean): Observable<BillingSettings> {
    return this.http
      .put<ApiResponse<BillingSettings>>(`${this.base}/stripe/enabled`, { enabled })
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ QuickBooks Online

  /** OAuth URL; lands on returnUrl?qbo=connected|cancelled. */
  qboConnectUrl(returnUrl: string): Observable<OAuthUrl> {
    return this.http
      .get<ApiResponse<OAuthUrl>>(`${this.base}/qbo/connect-url`, { params: { returnUrl } })
      .pipe(map((r) => unwrapData(r)));
  }

  qboDisconnect(): Observable<BillingSettings> {
    return this.http
      .post<ApiResponse<BillingSettings>>(`${this.base}/qbo/disconnect`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  qboEnabled(enabled: boolean): Observable<BillingSettings> {
    return this.http
      .put<ApiResponse<BillingSettings>>(`${this.base}/qbo/enabled`, { enabled })
      .pipe(map((r) => unwrapData(r)));
  }

  /** Live from QuickBooks (SuperAdmin). */
  qboItems(): Observable<QboItem[]> {
    return this.http.get<ApiResponse<QboItem[]>>(`${this.base}/qbo/items`).pipe(map((r) => r.data ?? []));
  }

  qboItemMap(): Observable<QboItemMapRow[]> {
    return this.http.get<ApiResponse<QboItemMapRow[]>>(`${this.base}/qbo/item-map`).pipe(map((r) => r.data ?? []));
  }

  /** qboItemId null / blank removes the mapping. */
  saveQboItemMap(items: { serviceTypeId: number; qboItemId: string | null; qboItemName: string | null }[]): Observable<QboItemMapRow[]> {
    return this.http
      .put<ApiResponse<QboItemMapRow[]>>(`${this.base}/qbo/item-map`, { items })
      .pipe(map((r) => r.data ?? []));
  }

  qboFailures(page = 1, pageSize = 20): Observable<BillingPage<AccountingFailure>> {
    return this.http
      .get<ApiResponse<BillingPage<AccountingFailure>>>(`${this.base}/qbo/failures`, { params: queryParams({ page, pageSize }) })
      .pipe(map((r) => unwrapData(r)));
  }

  retryQboFailure(queueId: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.base}/qbo/failures/${queueId}/retry`, {})
      .pipe(map((r) => unwrapOptional(r)));
  }

  resolveQboFailure(queueId: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.base}/qbo/failures/${queueId}/resolve`, {})
      .pipe(map((r) => unwrapOptional(r)));
  }
}
