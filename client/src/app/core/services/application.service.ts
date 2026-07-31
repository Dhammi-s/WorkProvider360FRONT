import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/paged-result.model';
import {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationSettings,
  ApplicationStatus,
  CreateQuestionRequest,
  PublicFormConfig,
  Question,
  SubmitApplicationRequest,
  UpdateQuestionRequest,
  UpsertApplicationSettings,
} from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly appsUrl = `${environment.apiBaseUrl}/applications`;
  private readonly settingsUrl = `${environment.apiBaseUrl}/settings`;

  // ---- Public form ----
  getFormConfig(): Observable<PublicFormConfig> {
    return this.http
      .get<ApiResponse<PublicFormConfig>>(`${this.appsUrl}/form-config`)
      .pipe(map((r) => this.unwrap(r)));
  }

  submit(request: SubmitApplicationRequest): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(this.appsUrl, request)
      .pipe(map((r) => r.message ?? 'Application submitted.'));
  }

  // ---- Review ----
  listPaged(status: ApplicationStatus | undefined, page = 1, pageSize = 10): Observable<PagedResult<ApplicationListItem>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<PagedResult<ApplicationListItem>>>(`${this.appsUrl}/paged`, { params })
      .pipe(map((r) => r.data ?? { items: [], total: 0, page, pageSize }));
  }

  list(status?: ApplicationStatus): Observable<ApplicationListItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<ApplicationListItem[]>>(this.appsUrl, { params })
      .pipe(map((r) => r.data ?? []));
  }

  detail(id: number): Observable<ApplicationDetail> {
    return this.http
      .get<ApiResponse<ApplicationDetail>>(`${this.appsUrl}/${id}`)
      .pipe(map((r) => this.unwrap(r)));
  }

  approve(id: number, officeId?: string | null): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.appsUrl}/${id}/approve`, { officeId: officeId ?? null })
      .pipe(map((r) => r.message ?? 'Approved.'));
  }

  reject(id: number, reason: string): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.appsUrl}/${id}/reject`, { reason })
      .pipe(map((r) => r.message ?? 'Rejected.'));
  }

  // ---- Settings + questions ----
  getSettings(): Observable<ApplicationSettings> {
    return this.http
      .get<ApiResponse<ApplicationSettings>>(`${this.settingsUrl}/application`)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(request: UpsertApplicationSettings): Observable<ApplicationSettings> {
    return this.http
      .put<ApiResponse<ApplicationSettings>>(`${this.settingsUrl}/application`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  getQuestions(): Observable<Question[]> {
    return this.http
      .get<ApiResponse<Question[]>>(`${this.settingsUrl}/application/questions`)
      .pipe(map((r) => r.data ?? []));
  }

  createQuestion(request: CreateQuestionRequest): Observable<Question> {
    return this.http
      .post<ApiResponse<Question>>(`${this.settingsUrl}/application/questions`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  updateQuestion(id: number, request: UpdateQuestionRequest): Observable<Question> {
    return this.http
      .put<ApiResponse<Question>>(`${this.settingsUrl}/application/questions/${id}`, request)
      .pipe(map((r) => this.unwrap(r)));
  }

  deleteQuestion(id: number): Observable<string> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.settingsUrl}/application/questions/${id}`)
      .pipe(map((r) => r.message ?? 'Removed.'));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) {
      throw new Error(res.message ?? 'Request failed.');
    }
    return res.data;
  }
}
