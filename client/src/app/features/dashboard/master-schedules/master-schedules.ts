/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { formatDateOnly, todayDateOnly } from '../../../core/models/authorization.model';
import {
  ScheduleSeries,
  SeriesStatus,
  patternLabel,
  seriesStatusClass,
} from '../../../core/models/schedule-series.model';
import { ScheduleSeriesService } from '../../../core/services/schedule-series.service';
import { ToastService } from '../../../core/services/toast.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Paginator } from '../../../shared/ui/paginator/paginator';
import { SeriesEditor } from './series-editor/series-editor';
import { SeriesPublish } from './series-publish/series-publish';

/** Master schedules: list of recurring series with editor, status actions and publishing. */
@Component({
  selector: 'app-master-schedules',
  imports: [FormsModule, RouterLink, Alert, ConfirmDialog, Paginator, SeriesEditor, SeriesPublish],
  templateUrl: './master-schedules.html',
})
export class MasterSchedules {
  private readonly service = inject(ScheduleSeriesService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ScheduleSeries[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly search = signal('');
  readonly statusFilter = signal<SeriesStatus | 'All'>('Active');
  private readonly search$ = new Subject<string>();

  // Overlays
  readonly editorOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly publishOpen = signal(false);
  readonly publishSeriesIds = signal<number[] | null>(null);
  readonly menuFor = signal<number | null>(null);
  private readonly menuPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  readonly confirmDelete = signal<ScheduleSeries | null>(null);
  readonly endDialog = signal<ScheduleSeries | null>(null);
  readonly endDate = signal(todayDateOnly());
  readonly endRemoveFuture = signal(true);
  readonly busy = signal(false);
  readonly blocked = signal<string>('');

  readonly menuTarget = computed(() => {
    const id = this.menuFor();
    const s = id == null ? undefined : this.items().find((x) => x.seriesId === id);
    return s ? { s, ...this.menuPos() } : null;
  });

  readonly patternLabel = patternLabel;
  readonly statusClass = seriesStatusClass;
  readonly fmtDate = formatDateOnly;

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.statusFilter(),
        search: this.search().trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load master schedules.');
          this.loading.set(false);
        },
      });
  }

  onSearch(q: string): void {
    this.search.set(q);
    this.search$.next(q);
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSize(n: number): void {
    this.pageSize.set(n);
    this.applyFilters();
  }

  // ------------------------------------------------------------- Editor / publish

  openCreate(): void {
    this.editingId.set(null);
    this.editorOpen.set(true);
  }

  openEdit(s: ScheduleSeries): void {
    this.menuFor.set(null);
    this.editingId.set(s.seriesId);
    this.editorOpen.set(true);
  }

  onSaved(): void {
    this.editorOpen.set(false);
    this.load();
  }

  openPublish(seriesIds: number[] | null = null): void {
    this.menuFor.set(null);
    this.publishSeriesIds.set(seriesIds);
    this.publishOpen.set(true);
  }

  onPublishClosed(changed: boolean): void {
    this.publishOpen.set(false);
    if (changed) this.load();
  }

  // ------------------------------------------------------------- Row menu

  toggleMenu(s: ScheduleSeries, event: MouseEvent): void {
    if (this.menuFor() === s.seriesId) {
      this.menuFor.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 170;
    const below = rect.bottom + 4 + menuHeight <= window.innerHeight;
    this.menuPos.set({
      top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
      left: Math.max(8, rect.right - menuWidth),
    });
    this.menuFor.set(s.seriesId);
  }

  setPaused(s: ScheduleSeries, paused: boolean): void {
    this.menuFor.set(null);
    this.busy.set(true);
    this.service
      .setStatus(s.seriesId, { status: paused ? 'Paused' : 'Active', removeFutureVisits: false })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success(paused ? `${s.title} paused.` : `${s.title} resumed.`);
          this.load();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.toast.error(err.message || 'Could not change the status.');
        },
      });
  }

  askEnd(s: ScheduleSeries): void {
    this.menuFor.set(null);
    this.endDate.set(todayDateOnly());
    this.endRemoveFuture.set(true);
    this.endDialog.set(s);
  }

  doEnd(): void {
    const s = this.endDialog();
    if (!s) return;
    if (!this.endDate()) {
      this.toast.error('Choose the end date.');
      return;
    }
    this.endDialog.set(null);
    this.busy.set(true);
    this.service
      .setStatus(s.seriesId, { status: 'Ended', endDate: this.endDate(), removeFutureVisits: this.endRemoveFuture() })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          const a = r.appliedToPublished;
          this.toast.success(
            a ? `${s.title} ended. ${a.removed + a.cancelled} future visit(s) removed.` : `${s.title} ended.`,
          );
          this.load();
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.toast.error(err.message || 'Could not end the master schedule.');
        },
      });
  }

  askDelete(s: ScheduleSeries): void {
    this.menuFor.set(null);
    this.confirmDelete.set(s);
  }

  doDelete(): void {
    const s = this.confirmDelete();
    if (!s) return;
    this.confirmDelete.set(null);
    this.busy.set(true);
    this.service.remove(s.seriesId).subscribe({
      next: (msg) => {
        this.busy.set(false);
        this.toast.success(msg);
        if (this.items().length === 1 && this.page() > 1) this.page.update((p) => p - 1);
        this.load();
      },
      error: (err: Error) => {
        this.busy.set(false);
        // 409: visits were published; end the series instead.
        this.blocked.set(err.message || 'Could not delete the master schedule.');
      },
    });
  }

  caregiverLabel(s: ScheduleSeries): string {
    return s.assignedUserId == null ? 'Open shift' : s.assignedUserName || '—';
  }

  autoPublishLabel(s: ScheduleSeries): string {
    return s.autoPublishWeeksAhead > 0
      ? `${s.autoPublishWeeksAhead} week${s.autoPublishWeeksAhead === 1 ? '' : 's'} ahead`
      : 'Manual';
  }

  slotsLabel(s: ScheduleSeries): string {
    return `${s.slotCount} slot${s.slotCount === 1 ? '' : 's'}`;
  }
}
