/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-09
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AddParticipantRequest,
  CreateMeetingRequest,
  Meeting,
  MeetingAccess,
  MeetingDetail,
  MeetingParticipant,
  MeetingPayment,
  MeetingPaymentSummary,
  MeetingSettings,
  RecordPaymentRequest,
  RespondMeetingRequest,
  UpdateMeetingRequest,
  UpdateMeetingSettingsRequest,
} from '../models/meeting.model';

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/meetings`;

  // ---- Settings ----

  getAccess(): Observable<MeetingAccess> {
    return this.http
      .get<ApiResponse<MeetingAccess>>(`${this.base}/access`)
      .pipe(map((r) => this.unwrap(r)));
  }

  getSettings(): Observable<MeetingSettings> {
    return this.http
      .get<ApiResponse<MeetingSettings>>(`${this.base}/settings`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpdateMeetingSettingsRequest): Observable<MeetingSettings> {
    return this.http
      .put<ApiResponse<MeetingSettings>>(`${this.base}/settings`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Meetings ----

  list(
    from?: string,
    to?: string,
    status?: string,
    userId?: number,
    clientId?: number,
  ): Observable<Meeting[]> {
    let params = new HttpParams();
    if (from)     params = params.set('from',     from);
    if (to)       params = params.set('to',       to);
    if (status)   params = params.set('status',   status);
    if (userId   != null) params = params.set('userId',   String(userId));
    if (clientId != null) params = params.set('clientId', String(clientId));
    return this.http
      .get<ApiResponse<Meeting[]>>(this.base, { params })
      .pipe(map((r) => r.data ?? []));
  }

  getById(id: number): Observable<MeetingDetail> {
    return this.http
      .get<ApiResponse<MeetingDetail>>(`${this.base}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: CreateMeetingRequest): Observable<Meeting> {
    return this.http
      .post<ApiResponse<Meeting>>(this.base, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: UpdateMeetingRequest): Observable<Meeting> {
    return this.http
      .put<ApiResponse<Meeting>>(`${this.base}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateStatus(id: number, status: string): Observable<Meeting> {
    return this.http
      .patch<ApiResponse<Meeting>>(`${this.base}/${id}/status`, { status })
      .pipe(map((r) => this.unwrap(r)));
  }

  remove(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.base}/${id}`)
      .pipe(map((r) => r.message ?? 'Deleted.'));
  }

  // ---- Participants ----

  getParticipants(meetingId: number): Observable<MeetingParticipant[]> {
    return this.http
      .get<ApiResponse<MeetingParticipant[]>>(`${this.base}/${meetingId}/participants`)
      .pipe(map((r) => r.data ?? []));
  }

  addParticipant(meetingId: number, request: AddParticipantRequest): Observable<MeetingParticipant> {
    return this.http
      .post<ApiResponse<MeetingParticipant>>(`${this.base}/${meetingId}/participants`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  removeParticipant(meetingId: number, participantId: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.base}/${meetingId}/participants/${participantId}`)
      .pipe(map((r) => r.message ?? 'Removed.'));
  }

  respond(meetingId: number, request: RespondMeetingRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/${meetingId}/respond`, request)
      .pipe(map((r) => r.message ?? 'Response recorded.'));
  }

  // ---- Payments ----

  getPayments(meetingId: number): Observable<MeetingPayment[]> {
    return this.http
      .get<ApiResponse<MeetingPayment[]>>(`${this.base}/${meetingId}/payments`)
      .pipe(map((r) => r.data ?? []));
  }

  getPaymentSummary(meetingId: number): Observable<MeetingPaymentSummary> {
    return this.http
      .get<ApiResponse<MeetingPaymentSummary>>(`${this.base}/${meetingId}/payments/summary`)
      .pipe(map((r) => this.unwrap(r)));
  }

  recordPayment(meetingId: number, request: RecordPaymentRequest): Observable<MeetingPayment> {
    return this.http
      .post<ApiResponse<MeetingPayment>>(`${this.base}/${meetingId}/payments`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Helpers ----

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
