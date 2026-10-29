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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  TRAINING_STATUS_BADGE,
  TRAINING_STATUS_LABELS,
  Training,
  TrainingAccess,
  TrainingAssignment,
  TrainingStatus,
} from '../../../core/models/training.model';
import { TrainingSessionService } from '../../../core/services/training-session.service';
import { TrainingService } from '../../../core/services/training.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { Paginator } from '../../../shared/ui/paginator/paginator';

/**
 * Team trainings (route data mode = 'team') and the approvals queue
 * (mode = 'approvals', fixed to Submitted). Leaders assign from here; who can be
 * picked follows the hierarchy (the API re-checks and reports skipped people).
 */
@Component({
  selector: 'app-training-assignments',
  imports: [FormsModule, DatePipe, RouterLink, Alert, Paginator],
  templateUrl: './training-assignments.html',
})
export class TrainingAssignments {
  private readonly training = inject(TrainingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(TrainingSessionService);

  readonly approvals = this.route.snapshot.data['mode'] === 'approvals';
  readonly labels = TRAINING_STATUS_LABELS;
  readonly badge = TRAINING_STATUS_BADGE;
  readonly statuses = ['Assigned', 'InProgress', 'Submitted', 'Rejected', 'Overdue', 'Approved', 'Cancelled'];

  readonly items = signal<TrainingAssignment[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly status = signal<string>(this.approvals ? 'Submitted' : (this.route.snapshot.queryParamMap.get('status') ?? ''));
  readonly search = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = signal('');

  // ---- assign dialog
  readonly assignOpen = signal(false);
  readonly trainings = signal<Training[]>([]);
  readonly people = signal<TrainingAccess[]>([]);
  readonly assignTrainingId = signal<number | null>(null);
  readonly assignUserIds = signal<Set<number>>(new Set());
  readonly assignDue = signal('');
  readonly assignNotes = signal('');
  readonly peopleFilter = signal('');
  readonly assigning = signal(false);
  readonly skipped = signal<string[]>([]);

  /** People the current user may assign to: below them in rank, portal enabled. */
  readonly assignable = computed(() => {
    const me = this.session.user();
    const q = this.peopleFilter().trim().toLowerCase();
    return this.people().filter(
      (p) =>
        p.enabled &&
        p.isActive &&
        p.userId !== me?.userId &&
        me != null &&
        p.roleId > me.roleId &&
        (!q || p.fullName.toLowerCase().includes(q) || p.roleName.toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.training
      .assignments({ status: this.status() || null, search: this.search() || null, page: this.page(), pageSize: this.pageSize() })
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
  }

  setStatus(s: string): void {
    this.status.set(s);
    this.page.set(1);
    this.router.navigate([], { queryParams: { status: s || null }, replaceUrl: true });
    this.load();
  }

  onSearch(): void {
    this.page.set(1);
    this.load();
  }

  quickReview(a: TrainingAssignment, approve: boolean): void {
    if (!approve) {
      // Sending back needs a reason, so open the full page.
      this.router.navigate(['/training/my', a.assignmentId]);
      return;
    }
    this.training.review(a.assignmentId, true).subscribe({
      next: (r) => {
        this.success.set(`${a.userName}: ${r.message ?? 'approved'}`);
        this.load();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  // ------------------------------------------------------------- assign

  openAssign(): void {
    this.assignOpen.set(true);
    this.skipped.set([]);
    this.assignUserIds.set(new Set());
    this.assignNotes.set('');
    this.assignTrainingId.set(null);
    const due = new Date();
    due.setDate(due.getDate() + 14);
    this.assignDue.set(due.toISOString().slice(0, 10));
    this.training.trainings().subscribe({ next: (t) => this.trainings.set(t), error: (e: Error) => this.error.set(e.message) });
    this.training.accessList(true).subscribe({ next: (p) => this.people.set(p), error: (e: Error) => this.error.set(e.message) });
    this.training.settings().subscribe({
      next: (s) => {
        const d = new Date();
        d.setDate(d.getDate() + s.defaultDueDays);
        this.assignDue.set(d.toISOString().slice(0, 10));
      },
      error: () => {},
    });
  }

  togglePerson(id: number): void {
    this.assignUserIds.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectAllVisible(): void {
    this.assignUserIds.set(new Set(this.assignable().map((p) => p.userId)));
  }

  submitAssign(): void {
    const trainingId = this.assignTrainingId();
    if (!trainingId || this.assignUserIds().size === 0) return;
    this.assigning.set(true);
    this.error.set('');
    this.training
      .assign({ trainingId, userIds: [...this.assignUserIds()], dueDate: this.assignDue() || null, notes: this.assignNotes() || null })
      .subscribe({
        next: (r) => {
          this.assigning.set(false);
          this.success.set(r.message ?? 'Assigned.');
          this.skipped.set(r.data?.skipped ?? []);
          if (!r.data?.skipped.length) this.assignOpen.set(false);
          this.load();
        },
        error: (e: Error) => {
          this.assigning.set(false);
          this.error.set(e.message);
        },
      });
  }

  statusLabel(s: string): string {
    return s === 'Overdue' ? 'Overdue' : (this.labels[s as TrainingStatus] ?? s);
  }

  roleLabel(role: string): string {
    return role === 'User' ? 'Caregiver' : role === 'SuperAdmin' ? 'Super Admin' : role;
  }
}
