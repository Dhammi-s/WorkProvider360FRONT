
/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh (Full Stack Software Engineer)
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ClientPayer } from '../models/payer.model';

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
        map(response => {
          if (!response.success) {
            throw new Error(response.message ?? 'Failed to load client payers.');
          }

          return response.data ?? [];
        })
      );
  }

  updatePayer(
    payerId: number,
    payload: Partial<ClientPayer>
  ): Observable<ClientPayer> {
    return this.http
      .put<ApiResponse<ClientPayer>>(
        `${this.baseUrl}/Clients/update-payer/${payerId}`,
        payload
      )
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message ?? 'Failed to update payer.');
          }

          if (!response.data) {
            throw new Error('The API did not return the updated payer.');
          }

          return response.data;
        })
      );
  }
}