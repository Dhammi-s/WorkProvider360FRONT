/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TrainingSessionService } from '../../../core/services/training-session.service';

/**
 * Target of the dashboard "Training" tab: swaps the main-app session for a
 * training-portal session (POST /training-auth/sso) and opens the portal.
 */
@Component({
  selector: 'app-training-sso',
  imports: [RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center wp-train-app-bg px-6">
      <div class="wp-tcard w-full max-w-sm text-center wp-anim-up">
        @if (error()) {
          <div class="text-lg font-bold text-slate-900">Training portal unavailable</div>
          <p class="mt-2 text-sm text-slate-500">{{ error() }}</p>
          <div class="mt-5 flex justify-center gap-3">
            <a routerLink="/dashboard" class="wp-btn-ghost">Back to dashboard</a>
            <a routerLink="/training-login" class="wp-btn-train">Training sign in</a>
          </div>
        } @else {
          <div class="wp-dot-loader mx-auto"></div>
          <p class="mt-4 text-sm font-medium text-train-800">Opening your training portal…</p>
        }
      </div>
    </div>
  `,
})
export class TrainingSso {
  private readonly session = inject(TrainingSessionService);
  private readonly router = inject(Router);
  readonly error = signal('');

  constructor() {
    this.session.singleSignOn().subscribe({
      next: () => this.router.navigateByUrl('/training', { replaceUrl: true }),
      error: (err: Error) => this.error.set(err.message || 'Could not open the training portal.'),
    });
  }
}
