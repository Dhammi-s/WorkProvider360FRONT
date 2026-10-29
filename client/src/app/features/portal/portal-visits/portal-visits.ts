/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortalService } from '../../../core/services/portal.service';
import { ClientVisit, ClientVisitDetail } from '../../../core/models/portal.model';
import { PortalVisitFeedback, VisitFeedback } from '../../../core/models/feedback.model';
import { Alert } from '../../../shared/ui/alert/alert';
import { StarRating } from '../../../shared/ui/star-rating/star-rating';

type Filter = 'Upcoming' | 'Completed' | 'All';

@Component({
  selector: 'app-portal-visits',
  imports: [DatePipe, FormsModule, Alert, StarRating],
  templateUrl: './portal-visits.html',
})
export class PortalVisits {
  private readonly portal = inject(PortalService);

  readonly filters: Filter[] = ['Upcoming', 'Completed', 'All'];
  readonly filter = signal<Filter>('Upcoming');

  readonly items = signal<ClientVisit[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly detail = signal<ClientVisitDetail | null>(null);
  readonly detailLoading = signal(false);

  // ---- feedback
  /** Feedback already given, by schedule id (stars on the list). */
  readonly feedbackBySchedule = signal<Map<number, VisitFeedback>>(new Map());
  readonly visitFeedback = signal<PortalVisitFeedback | null>(null);
  readonly editingFeedback = signal(false);
  readonly fVisit = signal(0);
  readonly fCaregiver = signal(0);
  readonly fComment = signal('');
  readonly savingFeedback = signal(false);
  readonly feedbackError = signal('');
  readonly feedbackNotice = signal('');

  readonly visible = computed(() => {
    const f = this.filter();
    const now = Date.now();
    return this.items().filter((v) => {
      if (f === 'All') return true;
      if (f === 'Completed') return v.status === 'Completed';
      return v.status !== 'Completed' && v.status !== 'Cancelled' && new Date(v.startUtc).getTime() >= now - 3600_000;
    });
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.portal.visits().subscribe({
      next: (v) => {
        this.items.set(v);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your visits.');
        this.loading.set(false);
      },
    });
    this.portal.myFeedback().subscribe({
      next: (rows) => this.feedbackBySchedule.set(new Map(rows.map((f) => [f.scheduleId, f]))),
      error: () => {},
    });
  }

  /** Finished (not cancelled) visit with no feedback yet: show a "Rate" hint on the list. */
  canRate(v: ClientVisit): boolean {
    return (
      !this.feedbackBySchedule().has(v.scheduleId) &&
      v.status !== 'Cancelled' &&
      v.status !== 'Rejected' &&
      (v.status === 'Completed' || new Date(v.endUtc).getTime() <= Date.now())
    );
  }

  private loadFeedback(scheduleId: number): void {
    this.visitFeedback.set(null);
    this.editingFeedback.set(false);
    this.feedbackError.set('');
    this.feedbackNotice.set('');
    this.portal.visitFeedback(scheduleId).subscribe({
      next: (f) => {
        this.visitFeedback.set(f);
        // Open the form straight away when the visit can be rated and has no feedback yet.
        if (f.canGiveFeedback && !f.feedback) this.startFeedback();
      },
      error: () => {},
    });
  }

  startFeedback(): void {
    const existing = this.visitFeedback()?.feedback;
    this.fVisit.set(existing?.visitRating ?? 0);
    this.fCaregiver.set(existing?.caregiverRating ?? 0);
    this.fComment.set(existing?.comment ?? '');
    this.feedbackError.set('');
    this.editingFeedback.set(true);
  }

  saveFeedback(): void {
    const d = this.detail();
    if (!d) return;
    if (!this.fVisit() || !this.fCaregiver()) {
      this.feedbackError.set('Please choose a star rating for the visit and for your caregiver.');
      return;
    }
    this.savingFeedback.set(true);
    this.feedbackError.set('');
    this.portal
      .saveVisitFeedback(d.scheduleId, { visitRating: this.fVisit(), caregiverRating: this.fCaregiver(), comment: this.fComment().trim() || null })
      .subscribe({
        next: (f) => {
          this.savingFeedback.set(false);
          this.editingFeedback.set(false);
          this.visitFeedback.update((v) => (v ? { ...v, feedback: f } : v));
          this.feedbackBySchedule.update((m) => new Map(m).set(f.scheduleId, f));
          this.feedbackNotice.set('Thank you for your feedback.');
        },
        error: (err: Error) => {
          this.savingFeedback.set(false);
          this.feedbackError.set(err.message || 'Could not save your feedback.');
        },
      });
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  open(v: ClientVisit): void {
    this.detailLoading.set(true);
    this.detail.set(null);
    this.loadFeedback(v.scheduleId);
    this.portal.visit(v.scheduleId).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  close(): void {
    this.detail.set(null);
  }

  hours(seconds: number): number {
    return Math.round((seconds / 3600) * 10) / 10;
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700';
      case 'InProgress':
        return 'bg-amber-50 text-amber-700';
      case 'Cancelled':
      case 'Rejected':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-portal-100 text-portal-700';
    }
  }
}
