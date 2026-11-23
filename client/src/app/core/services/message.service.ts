/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  MessageAccess,
  MessageDetail,
  MessageDetailQuery,
  MessageListItem,
  MessageListQuery,
  MessagePage,
  MessageSettings,
  PreviewRequest,
  PreviewResult,
  RecipientOption,
  RecipientSearchType,
  ResolveRequest,
  ResolveResult,
  SendMessageRequest,
  SendMessageResult,
  SendPushRequest,
} from '../models/message.model';
import { AuthService } from './auth.service';
import { queryParams, unwrapData } from './billing-http';

/** Send Custom Message (ADR-0006) and Push (ADR-0007): access, recipients, preview, send, history and settings. */
@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiBaseUrl}/messages`;

  // ------------------------------------------------------------------ Access

  /** The signed-in user's message access; null until loaded (or when the call failed). */
  readonly access = signal<MessageAccess | null>(null);
  readonly canSend = computed(() => !!this.access()?.canSend);
  readonly canView = computed(() => !!this.access()?.canView);
  readonly canManageSettings = computed(() => !!this.access()?.canManageSettings);
  readonly hasRecentFailures = computed(() => !!this.access()?.hasRecentFailures);
  readonly pushAvailable = computed(() => !!this.access()?.pushAvailable);
  private access$: Observable<MessageAccess | null> | null = null;
  private accessUserId: number | null = null;

  /** Loads the access once per signed-in user; errors (e.g. 403 for clients) resolve to null. */
  loadAccess(force = false): Observable<MessageAccess | null> {
    const userId = this.auth.user()?.userId ?? null;
    if (force || !this.access$ || this.accessUserId !== userId) {
      this.accessUserId = userId;
      this.access$ = this.http.get<ApiResponse<MessageAccess>>(`${this.base}/access`).pipe(
        map((r) => unwrapData(r)),
        tap((a) => this.access.set(a)),
        catchError(() => {
          this.access$ = null;
          this.access.set(null);
          return of(null);
        }),
        shareReplay(1),
      );
    }
    return this.access$;
  }

  // ------------------------------------------------------------------ Recipients

  /** Typeahead: users / clients / groups the caller may address (≤ 20 per kind). */
  searchRecipients(q: string, type: RecipientSearchType = 'all'): Observable<RecipientOption[]> {
    return this.http
      .get<ApiResponse<RecipientOption[]>>(`${this.base}/recipients/search`, { params: queryParams({ q: q ?? '', type }) })
      .pipe(map((r) => r.data ?? []));
  }

  /** Live recipients summary (counts per field, skipped, duplicates, total emails; Push: with app / in app only). */
  resolve(request: ResolveRequest): Observable<ResolveResult> {
    return this.http
      .post<ApiResponse<ResolveResult>>(`${this.base}/resolve`, { ...request, channel: request.channel ?? 'Email' })
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ Compose

  /** Server-rendered preview (sanitized, banner, personalization from the first To).
   *  Push: `subject` = title, `html` = plain text; the result carries `text` and `html: null`. */
  preview(request: PreviewRequest): Observable<PreviewResult> {
    return this.http
      .post<ApiResponse<PreviewResult>>(`${this.base}/preview`, { ...request, channel: request.channel ?? 'Email' })
      .pipe(map((r) => unwrapData(r)));
  }

  /** Queues a custom push notification (JSON, 202). */
  sendPush(request: SendPushRequest): Observable<SendMessageResult> {
    return this.http
      .post<ApiResponse<SendMessageResult>>(`${this.base}/push`, request)
      .pipe(map((r) => unwrapData(r)));
  }

  /** Queues the message: multipart with a JSON part `message` and 0–5 `files` parts (202). */
  send(request: SendMessageRequest, files: File[]): Observable<SendMessageResult> {
    const form = new FormData();
    // A plain form field (not a Blob with a file name) so the API reads it as a form value, not a file.
    form.append('message', JSON.stringify(request));
    for (const f of files) form.append('files', f, f.name);
    return this.http
      .post<ApiResponse<SendMessageResult>>(this.base, form)
      .pipe(map((r) => unwrapData(r)));
  }

  // ------------------------------------------------------------------ History

  list(q: MessageListQuery = {}): Observable<MessagePage<MessageListItem>> {
    const params = queryParams({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 25,
      status: q.status,
      from: q.from,
      to: q.to,
      search: q.search?.trim(),
      mine: q.mine ? 'true' : null,
      channel: q.channel || null,
    });
    return this.http
      .get<ApiResponse<MessagePage<MessageListItem>>>(this.base, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  detail(id: number, q: MessageDetailQuery = {}): Observable<MessageDetail> {
    const params = queryParams({
      recipientPage: q.recipientPage ?? 1,
      recipientPageSize: q.recipientPageSize ?? 50,
      recipientStatus: q.recipientStatus,
    });
    return this.http
      .get<ApiResponse<MessageDetail>>(`${this.base}/${id}`, { params })
      .pipe(map((r) => unwrapData(r)));
  }

  /** Re-queues the failed recipients (409 while queued/sending, 400 when nothing failed). */
  retry(id: number): Observable<{ requeuedCount: number }> {
    return this.http
      .post<ApiResponse<{ requeuedCount: number }>>(`${this.base}/${id}/retry`, {})
      .pipe(map((r) => unwrapData(r)));
  }

  /** Attachment file (404 when purged by the retention cleanup). */
  downloadAttachment(id: number, attachmentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/${id}/attachments/${attachmentId}`, { responseType: 'blob', observe: 'response' });
  }

  // ------------------------------------------------------------------ Settings

  getSettings(): Observable<MessageSettings> {
    return this.http
      .get<ApiResponse<MessageSettings>>(`${this.base}/settings`)
      .pipe(map((r) => unwrapData(r)));
  }

  updateSettings(settings: MessageSettings): Observable<MessageSettings> {
    return this.http
      .put<ApiResponse<MessageSettings>>(`${this.base}/settings`, settings)
      .pipe(map((r) => unwrapData(r)));
  }
}
