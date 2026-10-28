/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  QuizResult,
  TRAINING_STATUS_BADGE,
  TRAINING_STATUS_LABELS,
  TrainingAssignmentDetail,
} from '../../../core/models/training.model';
import { TrainingSessionService } from '../../../core/services/training-session.service';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';

/**
 * One assignment. The trainee watches the video / reads the PDF / takes the
 * quiz here; progress is saved as they go. Reviewers see the same page with
 * Approve / Send back / Cancel.
 */
@Component({
  selector: 'app-training-take',
  imports: [DatePipe, FormsModule, Alert],
  templateUrl: './training-take.html',
})
export class TrainingTake {
  private readonly training = inject(TrainingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly session = inject(TrainingSessionService);

  readonly detail = signal<TrainingAssignmentDetail | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly labels = TRAINING_STATUS_LABELS;
  readonly badge = TRAINING_STATUS_BADGE;

  /** Quiz answers by question index (-1 = unanswered). */
  readonly answers = signal<number[]>([]);
  readonly quizResult = signal<QuizResult | null>(null);
  readonly reviewComment = signal('');
  readonly documentOpened = signal(false);

  /** Highest saved progress, so we only save when it moves forward. */
  private savedProgress = 0;
  private savingProgress = false;

  readonly isTrainee = computed(() => this.detail()?.assignment.userId === this.session.user()?.userId);
  readonly isOpen = computed(() => {
    const s = this.detail()?.assignment.status;
    return s === 'Assigned' || s === 'InProgress' || s === 'Rejected';
  });
  readonly canWork = computed(() => this.isTrainee() && this.isOpen());
  readonly allAnswered = computed(() => this.answers().length > 0 && this.answers().every((a) => a >= 0));
  readonly videoWatched = computed(() => (this.detail()?.assignment.progressPercent ?? 0) >= 90);

  /** PDFs are shown inline; other links just open in a new tab. */
  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.detail()?.training.contentUrl;
    if (!url || !/\.pdf($|\?)/i.test(url)) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.training.assignment(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.savedProgress = d.assignment.progressPercent;
        this.answers.set((d.training.questions ?? []).map(() => -1));
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------- progress

  onVideoProgress(video: HTMLVideoElement): void {
    if (!this.canWork() || !video.duration) return;
    const pct = Math.floor((100 * video.currentTime) / video.duration);
    // Save in 10% steps so we don't flood the API.
    if (pct >= this.savedProgress + 10 || (pct >= 95 && this.savedProgress < 95)) this.saveProgress(Math.min(pct, 99));
  }

  openDocument(): void {
    this.documentOpened.set(true);
    if (this.canWork() && this.savedProgress < 50) this.saveProgress(50);
  }

  private saveProgress(pct: number): void {
    const d = this.detail();
    if (!d || this.savingProgress) return;
    this.savingProgress = true;
    this.training.saveProgress(d.assignment.assignmentId, pct).subscribe({
      next: (a) => {
        this.savedProgress = a.progressPercent;
        this.detail.set({ ...d, assignment: a });
        this.savingProgress = false;
      },
      error: () => (this.savingProgress = false),
    });
  }

  // ------------------------------------------------------------- complete

  complete(): void {
    const d = this.detail();
    if (!d) return;
    this.run(this.training.complete(d.assignment.assignmentId), (r) => r.message ?? 'Sent for approval.');
  }

  pick(question: number, option: number): void {
    this.answers.update((a) => a.map((v, i) => (i === question ? option : v)));
  }

  submitQuiz(): void {
    const d = this.detail();
    if (!d || !this.allAnswered()) return;
    this.busy.set(true);
    this.error.set('');
    this.training.submitQuiz(d.assignment.assignmentId, this.answers()).subscribe({
      next: (r) => {
        this.busy.set(false);
        if (!r.data) return;
        this.quizResult.set(r.data);
        this.detail.set({ ...d, assignment: r.data.assignment });
        if (!r.data.passed) this.answers.set(this.answers().map(() => -1));
        this.refreshHistory();
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.error.set(e.message);
      },
    });
  }

  // -------------------------------------------------------------- review

  approve(): void {
    const d = this.detail();
    if (d) this.run(this.training.review(d.assignment.assignmentId, true, this.reviewComment() || null), (r) => r.message ?? 'Approved.');
  }

  sendBack(): void {
    const d = this.detail();
    if (!d) return;
    if (!this.reviewComment().trim()) {
      this.error.set('Please write why the training is being sent back.');
      return;
    }
    this.run(this.training.review(d.assignment.assignmentId, false, this.reviewComment()), (r) => r.message ?? 'Sent back.');
  }

  cancelAssignment(): void {
    const d = this.detail();
    if (d) this.run(this.training.cancel(d.assignment.assignmentId, this.reviewComment() || null), (r) => r.message ?? 'Cancelled.');
  }

  private run<T extends { message?: string | null; data?: unknown }>(
    call: import('rxjs').Observable<T>,
    message: (r: T) => string,
  ): void {
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    call.subscribe({
      next: (r) => {
        this.busy.set(false);
        this.success.set(message(r));
        this.reviewComment.set('');
        this.load();
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.error.set(e.message);
      },
    });
  }

  private refreshHistory(): void {
    const d = this.detail();
    if (!d) return;
    this.training.assignment(d.assignment.assignmentId).subscribe({
      next: (fresh) => this.detail.set({ ...fresh, training: { ...fresh.training, questions: d.training.questions } }),
      error: () => {},
    });
  }

  back(): void {
    this.router.navigateByUrl(this.isTrainee() ? '/training/my' : '/training/approvals');
  }
}
