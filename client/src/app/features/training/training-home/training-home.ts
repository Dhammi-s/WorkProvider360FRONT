/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  TRAINING_STATUS_BADGE,
  TRAINING_STATUS_LABELS,
  TrainingDashboard,
  TrainingStats,
} from '../../../core/models/training.model';
import { TrainingSessionService } from '../../../core/services/training-session.service';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';

/** Training dashboard: my status, team status (leaders), approvals and recent activity. */
@Component({
  selector: 'app-training-home',
  imports: [RouterLink, DatePipe, DecimalPipe, Alert],
  templateUrl: './training-home.html',
})
export class TrainingHome {
  private readonly training = inject(TrainingService);
  readonly user = inject(TrainingSessionService).user;

  readonly data = signal<TrainingDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly labels = TRAINING_STATUS_LABELS;
  readonly badge = TRAINING_STATUS_BADGE;

  readonly firstName = computed(() => (this.user()?.fullName ?? '').split(' ')[0]);

  /** Completion rate: approved out of everything not cancelled. */
  completion(s: TrainingStats): number {
    const relevant = s.total - s.cancelled;
    return relevant > 0 ? Math.round((100 * s.approved) / relevant) : 0;
  }

  constructor() {
    this.training.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }
}
