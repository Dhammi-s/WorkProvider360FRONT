/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { RoleName } from '../models/role.model';
import { SHORTCUT_ACTIONS, Shortcut, ShortcutAction } from '../models/shortcut.model';
import { AuthService } from './auth.service';

/**
 * Loads the current user's keyboard shortcuts and applies them app-wide. A
 * single document keydown listener matches the pressed combo against the user's
 * shortcuts and navigates to the mapped action if the user's role allows it.
 * Combos are ignored while typing in a form field.
 */
@Injectable({ providedIn: 'root' })
export class ShortcutService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly baseUrl = `${environment.apiBaseUrl}/shortcuts`;

  private readonly _shortcuts = signal<Shortcut[]>([]);
  readonly shortcuts = this._shortcuts.asReadonly();

  /** Actions the current user may target, filtered by their role. */
  readonly availableActions = computed<ShortcutAction[]>(() => {
    const role = this.auth.roleName();
    if (!role) return [];
    return SHORTCUT_ACTIONS.filter((a) => a.roles.includes(role));
  });

  constructor() {
    this.document.addEventListener('keydown', (ev) => this.handleKey(ev as KeyboardEvent));
  }

  /** Load the user's saved shortcuts (call once after sign-in / on shell init). */
  load(): void {
    if (!this.auth.isAuthenticated()) return;
    this.http
      .get<ApiResponse<Shortcut[]>>(this.baseUrl)
      .pipe(map((r) => r.data ?? []))
      .subscribe({
        next: (list) => this._shortcuts.set(list),
        error: () => this._shortcuts.set([]),
      });
  }

  save(shortcuts: Shortcut[]): Observable<Shortcut[]> {
    return this.http
      .put<ApiResponse<Shortcut[]>>(this.baseUrl, { shortcuts })
      .pipe(
        map((r) => r.data ?? []),
        tap((saved) => this._shortcuts.set(saved)),
      );
  }

  /** Builds a normalized combo string like "Ctrl+Alt+1" from an event. */
  comboFromEvent(ev: KeyboardEvent): string | null {
    const key = ev.key;
    // Ignore lone modifier presses.
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return null;
    const parts: string[] = [];
    if (ev.ctrlKey) parts.push('Ctrl');
    if (ev.altKey) parts.push('Alt');
    if (ev.shiftKey) parts.push('Shift');
    if (ev.metaKey) parts.push('Meta');
    // Require at least one modifier so shortcuts never clash with plain typing.
    if (parts.length === 0) return null;
    let label = key;
    if (key.length === 1) label = key.toUpperCase();
    parts.push(label);
    return parts.join('+');
  }

  labelForAction(actionKey: string): string {
    return SHORTCUT_ACTIONS.find((a) => a.actionKey === actionKey)?.label ?? actionKey;
  }

  private handleKey(ev: KeyboardEvent): void {
    if (!this.auth.isAuthenticated()) return;
    const target = ev.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
    }
    const combo = this.comboFromEvent(ev);
    if (!combo) return;

    const match = this._shortcuts().find((s) => s.keyCombo === combo);
    if (!match) return;

    const role = this.auth.roleName();
    const action = SHORTCUT_ACTIONS.find((a) => a.actionKey === match.actionKey);
    if (!action || !role || !action.roles.includes(role)) return;

    ev.preventDefault();
    this.router.navigateByUrl(action.path);
  }
}
