/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpEvent, HttpEventType, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/paged-result.model';
import {
  AssignTrainingRequest,
  AssignTrainingResult,
  QuizResult,
  SaveTrainingRequest,
  SetTrainingAccessRequest,
  Training,
  TrainingAccess,
  TrainingAccessResult,
  TrainingAssignment,
  TrainingAssignmentDetail,
  TrainingCapabilities,
  TrainingDashboard,
  TrainingHistory,
  TrainingSettings,
} from '../models/training.model';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  uploadUrl: string;
}

/**
 * Training portal API (/api/training-portal). These calls carry the TRAINING
 * token (see authInterceptor), never the main-app token.
 */
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/training-portal`;

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) throw new Error(res.message ?? 'Request failed.');
    return res.data;
  }

  capabilities(): Observable<TrainingCapabilities> {
    return this.http.get<ApiResponse<TrainingCapabilities>>(`${this.baseUrl}/me/capabilities`).pipe(map((r) => this.unwrap(r)));
  }

  dashboard(): Observable<TrainingDashboard> {
    return this.http.get<ApiResponse<TrainingDashboard>>(`${this.baseUrl}/dashboard`).pipe(map((r) => this.unwrap(r)));
  }

  // ---- access tab
  accessList(enabledOnly = false): Observable<TrainingAccess[]> {
    const params = new HttpParams().set('enabledOnly', enabledOnly);
    return this.http.get<ApiResponse<TrainingAccess[]>>(`${this.baseUrl}/access`, { params }).pipe(map((r) => r.data ?? []));
  }

  setAccess(userId: number, request: SetTrainingAccessRequest): Observable<ApiResponse<TrainingAccessResult>> {
    return this.http.put<ApiResponse<TrainingAccessResult>>(`${this.baseUrl}/access/${userId}`, request);
  }

  resetPassword(userId: number): Observable<ApiResponse<TrainingAccessResult>> {
    return this.http.post<ApiResponse<TrainingAccessResult>>(`${this.baseUrl}/access/${userId}/reset-password`, {});
  }

  // ---- my trainings
  myAssignments(): Observable<TrainingAssignment[]> {
    return this.http.get<ApiResponse<TrainingAssignment[]>>(`${this.baseUrl}/my`).pipe(map((r) => r.data ?? []));
  }

  assignment(id: number): Observable<TrainingAssignmentDetail> {
    return this.http.get<ApiResponse<TrainingAssignmentDetail>>(`${this.baseUrl}/assignments/${id}`).pipe(map((r) => this.unwrap(r)));
  }

  saveProgress(id: number, progressPercent: number): Observable<TrainingAssignment> {
    return this.http
      .post<ApiResponse<TrainingAssignment>>(`${this.baseUrl}/assignments/${id}/progress`, { progressPercent })
      .pipe(map((r) => this.unwrap(r)));
  }

  complete(id: number): Observable<ApiResponse<TrainingAssignment>> {
    return this.http.post<ApiResponse<TrainingAssignment>>(`${this.baseUrl}/assignments/${id}/complete`, {});
  }

  submitQuiz(id: number, answers: number[]): Observable<ApiResponse<QuizResult>> {
    return this.http.post<ApiResponse<QuizResult>>(`${this.baseUrl}/assignments/${id}/quiz`, { answers });
  }

  // ---- team assignments / approvals
  assignments(filters: {
    status?: string | null;
    userId?: number | null;
    trainingId?: number | null;
    search?: string | null;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<TrainingAssignment>> {
    let params = new HttpParams().set('page', filters.page ?? 1).set('pageSize', filters.pageSize ?? 20);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.trainingId) params = params.set('trainingId', filters.trainingId);
    if (filters.search) params = params.set('search', filters.search);
    return this.http
      .get<ApiResponse<PagedResult<TrainingAssignment>>>(`${this.baseUrl}/assignments`, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page: 1, pageSize: 20 }));
  }

  assign(request: AssignTrainingRequest): Observable<ApiResponse<AssignTrainingResult>> {
    return this.http.post<ApiResponse<AssignTrainingResult>>(`${this.baseUrl}/assignments`, request);
  }

  review(id: number, approve: boolean, comment?: string | null): Observable<ApiResponse<TrainingAssignment>> {
    return this.http.post<ApiResponse<TrainingAssignment>>(`${this.baseUrl}/assignments/${id}/review`, { approve, comment });
  }

  cancel(id: number, comment?: string | null): Observable<ApiResponse<TrainingAssignment>> {
    return this.http.post<ApiResponse<TrainingAssignment>>(`${this.baseUrl}/assignments/${id}/cancel`, { comment });
  }

  // ---- catalog
  trainings(includeInactive = false): Observable<Training[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<ApiResponse<Training[]>>(`${this.baseUrl}/trainings`, { params }).pipe(map((r) => r.data ?? []));
  }

  training(id: number): Observable<Training> {
    return this.http.get<ApiResponse<Training>>(`${this.baseUrl}/trainings/${id}`).pipe(map((r) => this.unwrap(r)));
  }

  createTraining(request: SaveTrainingRequest): Observable<Training> {
    return this.http.post<ApiResponse<Training>>(`${this.baseUrl}/trainings`, request).pipe(map((r) => this.unwrap(r)));
  }

  updateTraining(id: number, request: SaveTrainingRequest): Observable<Training> {
    return this.http.put<ApiResponse<Training>>(`${this.baseUrl}/trainings/${id}`, request).pipe(map((r) => this.unwrap(r)));
  }

  setTrainingActive(id: number, isActive: boolean): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/trainings/${id}/active`, { isActive });
  }

  /** Signed Cloudinary direct upload for a training video or PDF. */
  uploadSignature(kind: 'Video' | 'Document'): Observable<UploadSignature> {
    return this.http
      .post<ApiResponse<UploadSignature>>(`${this.baseUrl}/trainings/upload-signature`, {}, { params: new HttpParams().set('kind', kind) })
      .pipe(map((r) => this.unwrap(r)));
  }

  /**
   * Uploads a video / PDF straight to Cloudinary with the server's signature
   * (the API secret never reaches the browser). Emits progress, then the URL.
   */
  uploadToCloudinary(file: File, sig: UploadSignature, kind: 'Video' | 'Document'): Observable<{ progress: number; url?: string; publicId?: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    // Only the video signature includes allowed_formats (see CloudinaryService).
    if (kind === 'Video') form.append('allowed_formats', sig.allowedFormats);
    const req = new HttpRequest('POST', sig.uploadUrl, form, { reportProgress: true });
    return this.http.request<{ secure_url: string; public_id: string }>(req).pipe(
      filter((e: HttpEvent<{ secure_url: string; public_id: string }>) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e) => {
        if (e.type === HttpEventType.UploadProgress) {
          return { progress: e.total ? Math.min(99, Math.round((100 * e.loaded) / e.total)) : 0 };
        }
        const body = (e as { body: { secure_url: string; public_id: string } }).body;
        return { progress: 100, url: body.secure_url, publicId: body.public_id };
      }),
    );
  }

  // ---- reports
  report(filters: { from?: string | null; to?: string | null; userId?: number | null; status?: string | null; page?: number; pageSize?: number }): Observable<PagedResult<TrainingHistory>> {
    let params = new HttpParams().set('page', filters.page ?? 1).set('pageSize', filters.pageSize ?? 50);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.status) params = params.set('status', filters.status);
    return this.http
      .get<ApiResponse<PagedResult<TrainingHistory>>>(`${this.baseUrl}/reports`, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page: 1, pageSize: 50 }));
  }

  // ---- settings (Super Admin)
  settings(): Observable<TrainingSettings> {
    return this.http.get<ApiResponse<TrainingSettings>>(`${this.baseUrl}/settings`).pipe(map((r) => this.unwrap(r)));
  }

  saveSettings(s: Omit<TrainingSettings, 'lastReminderRunDate'>): Observable<TrainingSettings> {
    return this.http.put<ApiResponse<TrainingSettings>>(`${this.baseUrl}/settings`, s).pipe(map((r) => this.unwrap(r)));
  }
}
