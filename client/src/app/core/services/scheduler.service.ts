/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { UserDto } from '../models/user.model';
import {
  AllocationPreview,
  AllocationPreviewRequest,
  AllocationShare,
  AuthorizationLimitPolicy,
} from '../models/authorization.model';
import {
  ClockRequest,
  CreateScheduleNoteRequest,
  CreateScheduleRequest,
  LiveLocation,
  LocationPing,
  ManualTimeEntryRequest,
  RecordLocationRequest,
  RespondScheduleRequest,
  Schedule,
  ScheduleDetail,
  ScheduleNote,
  ScheduleReport,
  SchedulingAccess,
  SchedulingSettings,
  TimeEntrySignature,
  CareLogEntry,
  ScheduleConflict,
  TimeEntry,
  UpdateSchedulingAccess,
  UpdateSchedulingDefaults,
  UpdateSchedulingApproval,
  UpdateScheduleRequest,
  UpdateSchedulingAutomation,
  OpenShift,
  ShiftOffer,
  OfferResponseRequest,
  CaregiverSuggestion,
  SuggestionRequest,
  FillProposal,
  FillApplyResult,
  PendingConfirmation,
  RemindResult,
} from '../models/scheduler.model';

@Injectable({ providedIn: 'root' })
export class SchedulerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/scheduling`;

  // ---- Access / settings ----
  getAccess(): Observable<SchedulingAccess> {
    return this.http
      .get<ApiResponse<SchedulingAccess>>(`${this.baseUrl}/access`)
      .pipe(map((r) => this.unwrap(r)));
  }

  getSettings(): Observable<SchedulingSettings> {
    return this.http
      .get<ApiResponse<SchedulingSettings>>(`${this.baseUrl}/settings`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateAccess(request: UpdateSchedulingAccess): Observable<SchedulingSettings> {
    return this.http
      .put<ApiResponse<SchedulingSettings>>(`${this.baseUrl}/settings/access`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateDefaults(request: UpdateSchedulingDefaults): Observable<SchedulingSettings> {
    return this.http
      .put<ApiResponse<SchedulingSettings>>(`${this.baseUrl}/settings/defaults`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateApproval(request: UpdateSchedulingApproval): Observable<SchedulingSettings> {
    return this.http
      .put<ApiResponse<SchedulingSettings>>(`${this.baseUrl}/settings/approval`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  /** SuperAdmin: what happens when a visit exceeds a payer authorization. */
  updateAuthorizationPolicy(policy: AuthorizationLimitPolicy): Observable<SchedulingSettings> {
    return this.http
      .put<ApiResponse<SchedulingSettings>>(`${this.baseUrl}/settings/authorization-policy`, { policy })
      .pipe(map((r) => this.unwrap(r)));
  }

  /** How a proposed visit would split between the client's payers / authorizations. */
  previewAllocation(request: AllocationPreviewRequest): Observable<AllocationPreview> {
    return this.http
      .post<ApiResponse<AllocationPreview>>(`${this.baseUrl}/authorization-preview`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  /** A saved visit's split between payers / authorizations. */
  allocations(scheduleId: number): Observable<AllocationShare[]> {
    return this.http
      .get<ApiResponse<AllocationShare[]>>(`${this.baseUrl}/${scheduleId}/allocations`)
      .pipe(map((r) => r.data ?? []));
  }

  /** Approve / un-approve a schedule. */
  setApproval(id: number, approved: boolean): Observable<Schedule> {
    return this.http
      .post<ApiResponse<Schedule>>(`${this.baseUrl}/${id}/approval`, { approved })
      .pipe(map((r) => this.unwrap(r)));
  }

  assignableUsers(): Observable<UserDto[]> {
    return this.http
      .get<ApiResponse<UserDto[]>>(`${this.baseUrl}/assignable-users`)
      .pipe(map((r) => r.data ?? []));
  }

  // ---- Schedules ----
  list(fromUtc?: string, toUtc?: string, userId?: number, clientId?: number): Observable<Schedule[]> {
    let params = new HttpParams();
    if (fromUtc) params = params.set('from', fromUtc);
    if (toUtc) params = params.set('to', toUtc);
    if (userId != null) params = params.set('userId', String(userId));
    if (clientId != null) params = params.set('clientId', String(clientId));
    return this.http
      .get<ApiResponse<Schedule[]>>(this.baseUrl, { params })
      .pipe(map((r) => r.data ?? []));
  }

  detail(id: number): Observable<ScheduleDetail> {
    return this.http
      .get<ApiResponse<ScheduleDetail>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  create(request: CreateScheduleRequest): Observable<Schedule> {
    return this.http
      .post<ApiResponse<Schedule>>(this.baseUrl, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: UpdateScheduleRequest): Observable<Schedule> {
    return this.http
      .put<ApiResponse<Schedule>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  remove(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.message ?? 'Deleted.'));
  }

  // ---- Assigned-user actions ----
  respond(id: number, request: RespondScheduleRequest): Observable<Schedule> {
    return this.http
      .post<ApiResponse<Schedule>>(`${this.baseUrl}/${id}/respond`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  getNotes(id: number): Observable<ScheduleNote[]> {
    return this.http
      .get<ApiResponse<ScheduleNote[]>>(`${this.baseUrl}/${id}/notes`)
      .pipe(map((r) => r.data ?? []));
  }

  addNote(id: number, request: CreateScheduleNoteRequest): Observable<ScheduleNote> {
    return this.http
      .post<ApiResponse<ScheduleNote>>(`${this.baseUrl}/${id}/notes`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Time tracking ----
  clockIn(id: number, body: ClockRequest = {}): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/time/clock-in`, body)
      .pipe(map((r) => r.message ?? 'Clocked in.'));
  }

  clockOut(id: number, body: ClockRequest = {}): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/time/clock-out`, body)
      .pipe(map((r) => r.message ?? 'Clocked out.'));
  }

  getTime(id: number): Observable<TimeEntry[]> {
    return this.http
      .get<ApiResponse<TimeEntry[]>>(`${this.baseUrl}/${id}/time`)
      .pipe(map((r) => r.data ?? []));
  }

  signatures(id: number, entryId: number): Observable<TimeEntrySignature[]> {
    return this.http
      .get<ApiResponse<TimeEntrySignature[]>>(`${this.baseUrl}/${id}/time/${entryId}/signatures`)
      .pipe(map((r) => r.data ?? []));
  }

  careLog(id: number): Observable<CareLogEntry[]> {
    return this.http
      .get<ApiResponse<CareLogEntry[]>>(`${this.baseUrl}/${id}/care-log`)
      .pipe(map((r) => r.data ?? []));
  }

  /** Overlaps for a caregiver; with clientId also Unavailable and Compatibility rows. */
  conflicts(
    userId: number,
    startUtc: string,
    endUtc: string,
    excludeScheduleId?: number,
    clientId?: number | null,
  ): Observable<ScheduleConflict[]> {
    let params = new HttpParams()
      .set("userId", userId)
      .set("startUtc", startUtc)
      .set("endUtc", endUtc);
    if (excludeScheduleId != null) params = params.set("excludeScheduleId", excludeScheduleId);
    if (clientId != null) params = params.set("clientId", clientId);
    return this.http
      .get<ApiResponse<ScheduleConflict[]>>(`${this.baseUrl}/conflicts`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  addTime(id: number, request: ManualTimeEntryRequest): Observable<TimeEntry> {
    return this.http
      .post<ApiResponse<TimeEntry>>(`${this.baseUrl}/${id}/time`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateTime(id: number, entryId: number, request: ManualTimeEntryRequest): Observable<TimeEntry> {
    return this.http
      .put<ApiResponse<TimeEntry>>(`${this.baseUrl}/${id}/time/${entryId}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Live location ----
  recordLocation(id: number, request: RecordLocationRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/location`, request)
      .pipe(map((r) => r.message ?? 'Location recorded.'));
  }

  trail(id: number): Observable<LocationPing[]> {
    return this.http
      .get<ApiResponse<LocationPing[]>>(`${this.baseUrl}/${id}/location/trail`)
      .pipe(map((r) => r.data ?? []));
  }

  liveLocations(): Observable<LiveLocation[]> {
    return this.http
      .get<ApiResponse<LiveLocation[]>>(`${this.baseUrl}/location/live`)
      .pipe(map((r) => r.data ?? []));
  }

  // ---- Reports ----
  report(fromUtc: string, toUtc: string, userId?: number): Observable<ScheduleReport> {
    let params = new HttpParams().set('from', fromUtc).set('to', toUtc);
    if (userId != null) params = params.set('userId', String(userId));
    return this.http
      .get<ApiResponse<ScheduleReport>>(`${this.baseUrl}/reports`, { params })
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Scheduling suite: automation settings ----
  /** SuperAdmin: missed clock grace, open-shift mode, reminders, compatibility policy, expiry notices. */
  updateAutomation(request: UpdateSchedulingAutomation): Observable<SchedulingSettings> {
    return this.http
      .put<ApiResponse<SchedulingSettings>>(`${this.baseUrl}/settings/automation`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Open shifts / offers ----
  /** Managers: open shifts with interest counts; caregivers: shifts offered to them. */
  openShifts(from?: string, to?: string): Observable<OpenShift[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http
      .get<ApiResponse<OpenShift[]>>(`${this.baseUrl}/open-shifts`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  /** Offers of an open shift with match scores. */
  offers(scheduleId: number): Observable<ShiftOffer[]> {
    return this.http
      .get<ApiResponse<ShiftOffer[]>>(`${this.baseUrl}/${scheduleId}/offers`)
      .pipe(map((r) => r.data ?? []));
  }

  /** (Re)broadcast; null userIds = every eligible caregiver. */
  broadcast(scheduleId: number, userIds: number[] | null = null): Observable<ShiftOffer[]> {
    return this.http
      .post<ApiResponse<ShiftOffer[]>>(`${this.baseUrl}/${scheduleId}/offers`, { userIds })
      .pipe(map((r) => r.data ?? []));
  }

  /** Caregiver: Interested / Decline on their own offer. */
  respondToOffer(scheduleId: number, request: OfferResponseRequest): Observable<ShiftOffer> {
    return this.http
      .post<ApiResponse<ShiftOffer>>(`${this.baseUrl}/${scheduleId}/offer-response`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  assign(scheduleId: number, userId: number): Observable<Schedule> {
    return this.http
      .post<ApiResponse<Schedule>>(`${this.baseUrl}/${scheduleId}/assign`, { userId })
      .pipe(map((r) => this.unwrap(r)));
  }

  /** Ranked caregivers for a proposed visit (best first, excluded last). */
  suggestions(request: SuggestionRequest): Observable<CaregiverSuggestion[]> {
    return this.http
      .post<ApiResponse<CaregiverSuggestion[]>>(`${this.baseUrl}/suggestions`, request)
      .pipe(map((r) => r.data ?? []));
  }

  fillPreview(from: string, to: string): Observable<FillProposal[]> {
    return this.http
      .post<ApiResponse<FillProposal[]>>(`${this.baseUrl}/open-shifts/fill-preview`, { from, to })
      .pipe(map((r) => r.data ?? []));
  }

  fillApply(assignments: { scheduleId: number; userId: number }[]): Observable<FillApplyResult> {
    return this.http
      .post<ApiResponse<FillApplyResult>>(`${this.baseUrl}/open-shifts/fill-apply`, { assignments })
      .pipe(map((r) => this.unwrap(r)));
  }

  // ---- Pending confirmation ----
  pendingConfirmation(days = 7): Observable<PendingConfirmation[]> {
    return this.http
      .get<ApiResponse<PendingConfirmation[]>>(`${this.baseUrl}/pending-confirmation`, {
        params: { days: String(days) },
      })
      .pipe(map((r) => r.data ?? []));
  }

  remind(scheduleIds: number[]): Observable<RemindResult> {
    return this.http
      .post<ApiResponse<RemindResult>>(`${this.baseUrl}/pending-confirmation/remind`, { scheduleIds })
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
