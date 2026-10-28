
/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh (Full Stack Software Engineer)
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ClientBillingRates,
  ClientPayer,
  ClientPayerLinkRequest,
  LinkClientPayerRequest,
  ResolvedRates,
} from '../models/payer.model';

/** A client's links to agency payers, plus the client's billing rates. */
@Injectable({ providedIn: 'root' })
export class ClientPayerService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiBaseUrl;

  getPayersByClient(clientId: number): Observable<ClientPayer[]> {
    return this.http
      .get<ApiResponse<ClientPayer[]>>(
        `${this.baseUrl}/Clients/get-payers-by-client/${clientId}`
      )
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message ?? 'Failed to load client payers.');
          }

          return response.data ?? [];
        })
      );
  }

  /** Link an agency payer to the client; returns the client's payers. */
  linkPayer(clientId: number, request: LinkClientPayerRequest): Observable<ClientPayer[]> {
    return this.http
      .post<ApiResponse<ClientPayer[]>>(`${this.baseUrl}/Clients/${clientId}/payers`, request)
      .pipe(map((r) => this.unwrap(r, 'Could not link the payer.')));
  }

  /** Edit a link (dates, policy, subscriber, payment distribution); returns the client's payers. */
  updateLink(clientId: number, clientPayerId: number, request: ClientPayerLinkRequest): Observable<ClientPayer[]> {
    return this.http
      .put<ApiResponse<ClientPayer[]>>(`${this.baseUrl}/Clients/${clientId}/payers/${clientPayerId}`, request)
      .pipe(map((r) => this.unwrap(r, 'Could not save the payer.')));
  }

  /** Every active ClientPayerId in the new order (first = primary). */
  reorder(clientId: number, clientPayerIds: number[]): Observable<ClientPayer[]> {
    return this.http
      .put<ApiResponse<ClientPayer[]>>(`${this.baseUrl}/Clients/${clientId}/payers/order`, { clientPayerIds })
      .pipe(map((r) => this.unwrap(r, 'Could not reorder the payers.')));
  }

  setActive(clientId: number, clientPayerId: number, isActive: boolean): Observable<ClientPayer[]> {
    return this.http
      .patch<ApiResponse<ClientPayer[]>>(`${this.baseUrl}/Clients/${clientId}/payers/${clientPayerId}/active`, { isActive })
      .pipe(map((r) => this.unwrap(r, 'Could not change the payer.')));
  }

  /** Re-applies the client's payers to visits not yet invoiced; returns the success message. */
  syncToVisits(clientId: number): Observable<string> {
    return this.http
      .post<ApiResponse<number>>(`${this.baseUrl}/Clients/${clientId}/payers/sync`, {})
      .pipe(
        map((r) => {
          if (!r.success) throw new Error(r.message ?? 'Could not sync payers.');
          return r.message ?? 'Payers applied to visits not yet invoiced.';
        }),
      );
  }

  getBillingRates(clientId: number): Observable<ClientBillingRates> {
    return this.http
      .get<ApiResponse<ClientBillingRates>>(`${this.baseUrl}/Clients/${clientId}/billing-rates`)
      .pipe(map((r) => this.unwrap(r, 'Could not load billing rates.')));
  }

  updateBillingRates(
    clientId: number,
    request: { billRatePerHour: number | null; payRatePerHour: number | null },
  ): Observable<ClientBillingRates> {
    return this.http
      .put<ApiResponse<ClientBillingRates>>(`${this.baseUrl}/Clients/${clientId}/billing-rates`, request)
      .pipe(map((r) => this.unwrap(r, 'Could not save billing rates.')));
  }

  /** Rates for a new shift: client, payers in rank order, then agency defaults. */
  resolvedRates(clientId: number): Observable<ResolvedRates> {
    return this.http
      .get<ApiResponse<ResolvedRates>>(`${this.baseUrl}/Clients/${clientId}/resolved-rates`)
      .pipe(map((r) => this.unwrap(r, 'Could not resolve rates.')));
  }

  private unwrap<T>(res: ApiResponse<T>, fallback: string): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? fallback);
    }
    return res.data;
  }
}
