/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatReply {
  answer: string;
}

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  createdOn: string;
}

/** Talks to the project assistant (RAG chatbot) on the backend. */
@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/chatbot`;

  ask(question: string, history: ChatTurn[]): Observable<string> {
    return this.http
      .post<ApiResponse<ChatReply>>(`${this.baseUrl}/ask`, { question, history })
      .pipe(map((res) => res.data?.answer ?? 'Sorry, I could not answer that.'));
  }

  /** The signed-in user's saved chat history (oldest first). */
  history(): Observable<ChatTurn[]> {
    return this.http
      .get<ApiResponse<ChatHistoryItem[]>>(`${this.baseUrl}/history`)
      .pipe(map((res) => (res.data ?? []).map((m) => ({ role: m.role, content: m.content }))));
  }

  clear(): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/history`).pipe(map(() => undefined));
  }
}
