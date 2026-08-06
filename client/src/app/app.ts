/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaService } from './core/services/pwa.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('client');
  private readonly pwa = inject(PwaService);

  /** Live browser connectivity — drives the full-screen "no internet" page. */
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  constructor() {
    // Register the service worker + capture the install prompt as early as possible.
    this.pwa.init();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }
  }

  /** Re-check the connection; if it's back, reload so the app refetches fresh data. */
  retry(): void {
    if (typeof navigator === 'undefined') return;
    this.online.set(navigator.onLine);
    if (navigator.onLine && typeof location !== 'undefined') location.reload();
  }
}
