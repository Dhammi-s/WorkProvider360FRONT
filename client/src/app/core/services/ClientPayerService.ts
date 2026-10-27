
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
  ResolvedRates,
  UpsertClientPayerRequest,
} from '../models/payer.model';

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

  /** Create a new payer for the client; returns the client's payers. */
  addPayer(clientId: number, request: UpsertClientPayerRequest): Observable<ClientPayer[]> {
    return this.http
      .post<ApiResponse<ClientPayer[]>>(`${this.baseUrl}/Clients/add-payer/${clientId}`, request)
      .pipe(map((r) => this.unwrap(r, 'Could not add the payer.')));
  }

  /** Update a payer's details, rank and rates; returns the client's payers. */
  updatePayer(clientId: number, request: UpsertClientPayerRequest): Observable<ClientPayer[]> {
    return this.http
      .put<ApiResponse<ClientPayer[]>>(`${this.baseUrl}/Clients/update-payer/${clientId}`, request)
      .pipe(map((r) => this.unwrap(r, 'Could not save the payer.')));
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

  /** Rates for a new shift: client, primary, secondary, other payers, then agency defaults. */
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
