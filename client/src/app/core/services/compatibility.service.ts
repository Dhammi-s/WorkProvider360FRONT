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
  CareAttribute,
  CareProfile,
  ClientCompatibility,
  SaveCareAttributeRequest,
  SaveCareProfile,
  SaveClientCompatibility,
} from '../models/compatibility.model';

/** Care attributes, client compatibility rules and caregiver care profiles. */
@Injectable({ providedIn: 'root' })
export class CompatibilityService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  // ---- Care attributes (agency list) ----
  attributes(includeInactive = false): Observable<CareAttribute[]> {
    return this.http
      .get<ApiResponse<CareAttribute[]>>(`${this.api}/care-attributes`, {
        params: { includeInactive: String(includeInactive) },
      })
      .pipe(map((r) => r.data ?? []));
  }

  createAttribute(request: SaveCareAttributeRequest): Observable<CareAttribute> {
    return this.http
      .post<ApiResponse<CareAttribute>>(`${this.api}/care-attributes`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateAttribute(id: number, request: SaveCareAttributeRequest): Observable<CareAttribute> {
    return this.http
      .put<ApiResponse<CareAttribute>>(`${this.api}/care-attributes/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  /** 409 when the attribute is in use (deactivate it instead). */
  deleteAttribute(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/care-attributes/${id}`)
      .pipe(map((r) => r.message ?? 'Attribute deleted.'));
  }

  // ---- Client compatibility ----
  clientCompatibility(clientId: number): Observable<ClientCompatibility> {
    return this.http
      .get<ApiResponse<ClientCompatibility>>(`${this.api}/clients/${clientId}/compatibility`)
      .pipe(map((r) => this.unwrap(r)));
  }

  saveClientCompatibility(clientId: number, request: SaveClientCompatibility): Observable<ClientCompatibility> {
    return this.http
      .put<ApiResponse<ClientCompatibility>>(`${this.api}/clients/${clientId}/compatibility`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Caregiver care profile ----
  careProfile(userId: number): Observable<CareProfile> {
    return this.http
      .get<ApiResponse<CareProfile>>(`${this.api}/users/${userId}/care-profile`)
      .pipe(map((r) => this.unwrap(r)));
  }

  saveCareProfile(userId: number, request: SaveCareProfile): Observable<CareProfile> {
    return this.http
      .put<ApiResponse<CareProfile>>(`${this.api}/users/${userId}/care-profile`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
