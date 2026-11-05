/* WorkProvider360 - Multi-tenant SaaS platform. Do NOT change without discussing with the software engineer. */

import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: number; type: ToastType; message: string; }

/** Global toaster: call show()/success() from anywhere; <app-toast> renders the stack. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'success', durationMs = 4000): void {
    if (!message) return;
    const id = this.nextId++;
    this.toasts.update((t) => [...t, { id, type, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 6000); }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
