/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import {
  Component,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AuthorizationDetail,
  AuthorizationUsage,
  AuthorizationVisit,
  allowedDaysLabel,
  displayStatusClass,
  displayStatusLabel,
  formatDateOnly,
  formatHours,
} from '../../../../core/models/authorization.model';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { Paginator } from '../../../../shared/ui/paginator/paginator';

/** "2025-03-03T09:00:00" → "9:00 AM" without any timezone conversion. */
function timeOf(value: string | null | undefined): string {
  const m = /T(\d{2}):(\d{2})/.exec(value ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Right-side drawer: an authorization's details, usage per window and the visits using it. */
@Component({
  selector: 'app-authorization-usage',
  imports: [Paginator],
  templateUrl: './authorization-usage.html',
})
export class AuthorizationUsagePanel {
  private readonly service = inject(AuthorizationService);

  readonly authorizationId = input.required<number>();
  readonly closed = output<void>();

  readonly detail = signal<AuthorizationDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly visits = signal<AuthorizationVisit[]>([]);
  readonly visitTotal = signal(0);
  readonly visitPage = signal(1);
  readonly visitPageSize = signal(10);
  readonly visitsLoading = signal(false);

  readonly statusClass = displayStatusClass;
  readonly statusLabel = displayStatusLabel;
  readonly fmtDate = formatDateOnly;
  readonly fmtHours = formatHours;
  readonly daysLabel = allowedDaysLabel;
  readonly timeOf = timeOf;

  constructor() {
    effect(() => {
      const id = this.authorizationId();
      untracked(() => {
        this.visitPage.set(1);
        this.load(id);
        this.loadVisits();
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.service.get(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the authorization.');
        this.loading.set(false);
      },
    });
  }

  loadVisits(): void {
    this.visitsLoading.set(true);
    this.service.visits(this.authorizationId(), this.visitPage(), this.visitPageSize()).subscribe({
      next: (r) => {
        this.visits.set(r.items);
        this.visitTotal.set(r.total);
        this.visitsLoading.set(false);
      },
      error: () => {
        this.visits.set([]);
        this.visitTotal.set(0);
        this.visitsLoading.set(false);
      },
    });
  }

  onVisitPage(p: number): void {
    this.visitPage.set(p);
    this.loadVisits();
  }

  onVisitPageSize(n: number): void {
    this.visitPageSize.set(n);
    this.visitPage.set(1);
    this.loadVisits();
  }

  percent(u: AuthorizationUsage): number {
    if (!u.limitHours) return 0;
    return Math.min(100, Math.round((u.usedHours / u.limitHours) * 100));
  }

  barClass(u: AuthorizationUsage): string {
    const p = this.percent(u);
    if (u.limitHours != null && u.usedHours > u.limitHours) return 'bg-red-500';
    if (p >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  windowLabel(u: AuthorizationUsage): string {
    if (!u.from && !u.to) return '';
    if (u.from === u.to) return this.fmtDate(u.from);
    return `${this.fmtDate(u.from)} – ${this.fmtDate(u.to)}`;
  }
}
