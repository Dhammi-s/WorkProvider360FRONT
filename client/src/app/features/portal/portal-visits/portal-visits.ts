/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PortalService } from '../../../core/services/portal.service';
import { ClientVisit, ClientVisitDetail } from '../../../core/models/portal.model';
import { Alert } from '../../../shared/ui/alert/alert';

type Filter = 'Upcoming' | 'Completed' | 'All';

@Component({
  selector: 'app-portal-visits',
  imports: [DatePipe, Alert],
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
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  open(v: ClientVisit): void {
    this.detailLoading.set(true);
    this.detail.set(null);
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
