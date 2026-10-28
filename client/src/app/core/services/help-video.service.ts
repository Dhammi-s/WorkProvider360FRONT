/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  CloudinaryUploadSignature,
  CloudinaryVideoUpload,
  CreateHelpVideoRequest,
  HelpVideo,
  HelpVideoAccess,
  HelpVideoSettings,
  SaveHelpVideoRequest,
} from '../models/help-video.model';

/** Upload progress (0-100) or the finished Cloudinary upload. */
export type UploadProgress = { progress: number; done?: undefined } | { progress: 100; done: CloudinaryVideoUpload };

@Injectable({ providedIn: 'root' })
export class HelpVideoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/helpvideos`;

  access(): Observable<HelpVideoAccess> {
    return this.http.get<ApiResponse<HelpVideoAccess>>(`${this.baseUrl}/access`).pipe(map((r) => this.unwrap(r)));
  }

  list(): Observable<HelpVideo[]> {
    return this.http.get<ApiResponse<HelpVideo[]>>(this.baseUrl).pipe(map((r) => r.data ?? []));
  }

  uploadSignature(): Observable<CloudinaryUploadSignature> {
    return this.http
      .post<ApiResponse<CloudinaryUploadSignature>>(`${this.baseUrl}/upload-signature`, {})
      .pipe(map((r) => this.unwrap(r)));
  }

  /**
   * Uploads the file straight to Cloudinary with the server's signature (the API
   * secret never reaches the browser). Emits progress, then the upload result.
   */
  uploadToCloudinary(file: File, sig: CloudinaryUploadSignature): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    form.append('allowed_formats', sig.allowedFormats);
    const req = new HttpRequest('POST', sig.uploadUrl, form, { reportProgress: true });
    return this.http.request<CloudinaryVideoUpload>(req).pipe(
      filter((e: HttpEvent<CloudinaryVideoUpload>) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e): UploadProgress => {
        if (e.type === HttpEventType.UploadProgress) {
          return { progress: e.total ? Math.min(99, Math.round((100 * e.loaded) / e.total)) : 0 };
        }
        return { progress: 100, done: (e as { body: CloudinaryVideoUpload }).body };
      }),
    );
  }

  create(request: CreateHelpVideoRequest): Observable<HelpVideo> {
    return this.http.post<ApiResponse<HelpVideo>>(this.baseUrl, request).pipe(map((r) => this.unwrap(r)));
  }

  update(id: number, request: SaveHelpVideoRequest): Observable<HelpVideo> {
    return this.http.put<ApiResponse<HelpVideo>>(`${this.baseUrl}/${id}`, request).pipe(map((r) => this.unwrap(r)));
  }

  remove(id: number): Observable<string> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(map((r) => r.message ?? 'Video deleted.'));
  }

  getSettings(): Observable<HelpVideoSettings> {
    return this.http.get<ApiResponse<HelpVideoSettings>>(`${this.baseUrl}/settings`).pipe(map((r) => this.unwrap(r)));
  }

  updateSettings(settings: HelpVideoSettings): Observable<HelpVideoSettings> {
    return this.http.put<ApiResponse<HelpVideoSettings>>(`${this.baseUrl}/settings`, settings).pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data == null) throw new Error(res.message ?? 'Request failed.');
    return res.data;
  }
}
