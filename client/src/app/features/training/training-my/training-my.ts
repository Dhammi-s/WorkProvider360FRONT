/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  TRAINING_STATUS_BADGE,
  TRAINING_STATUS_LABELS,
  TrainingAssignment,
} from '../../../core/models/training.model';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';

type Tab = 'todo' | 'waiting' | 'done';

/** The signed-in user's own trainings, grouped by what they need to do. */
@Component({
  selector: 'app-training-my',
  imports: [RouterLink, DatePipe, Alert],
  templateUrl: './training-my.html',
})
export class TrainingMy {
  private readonly training = inject(TrainingService);

  readonly items = signal<TrainingAssignment[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly tab = signal<Tab>('todo');
  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'todo', label: 'To do' },
    { key: 'waiting', label: 'Awaiting approval' },
    { key: 'done', label: 'Completed' },
  ];
  readonly labels = TRAINING_STATUS_LABELS;
  readonly badge = TRAINING_STATUS_BADGE;

  readonly groups = computed(() => {
    const all = this.items();
    return {
      todo: all.filter((a) => a.status === 'Assigned' || a.status === 'InProgress' || a.status === 'Rejected'),
      waiting: all.filter((a) => a.status === 'Submitted'),
      done: all.filter((a) => a.status === 'Approved' || a.status === 'Cancelled'),
    };
  });

  readonly visible = computed(() => this.groups()[this.tab()]);

  constructor() {
    this.training.myAssignments().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  icon(type: string): string {
    return type === 'Video' ? '🎬' : type === 'Quiz' ? '❓' : '📄';
  }
}
