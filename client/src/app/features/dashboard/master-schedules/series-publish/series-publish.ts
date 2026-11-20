/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { formatDateOnly } from '../../../../core/models/authorization.model';
import { Client } from '../../../../core/models/client.model';
import {
  OccurrenceState,
  PublishRequest,
  PublishResult,
  ScheduleSeries,
  SeriesPreview,
  occurrenceStateClass,
  occurrenceStateLabel,
  patternLabel,
} from '../../../../core/models/schedule-series.model';
import { addDaysDateOnly, localDateOnly, wallDate, wallTime } from '../../../../core/models/scheduler.model';
import { ClientService } from '../../../../core/services/client.service';
import { ScheduleSeriesService } from '../../../../core/services/schedule-series.service';

const MAX_DAYS = 56;

/** Full-screen publish: range + client / series → preview per occurrence → publish → result. */
@Component({
  selector: 'app-series-publish',
  imports: [FormsModule],
  templateUrl: './series-publish.html',
})
export class SeriesPublish implements OnInit {
  private readonly service = inject(ScheduleSeriesService);
  private readonly clients = inject(ClientService);

  /** Pre-selected series (row action); null = pick a client or series here. */
  readonly presetSeriesIds = input<number[] | null>(null);
  /** Emits true when visits were published (the list reloads). */
  readonly closed = output<boolean>();

  readonly today = localDateOnly();
  readonly maxDate = addDaysDateOnly(this.today, MAX_DAYS - 1);
  readonly from = signal(this.today);
  readonly to = signal(addDaysDateOnly(this.today, 13));
  readonly scope = signal<'client' | 'series'>('series');
  readonly openShiftOnConflict = signal(false);

  // Client scope
  readonly clientId = signal<number | null>(null);
  readonly clientQuery = signal('');
  readonly clientOptions = signal<Client[]>([]);
  readonly clientPickerOpen = signal(false);
  private readonly clientSearch$ = new Subject<string>();

  // Series scope
  readonly allSeries = signal<ScheduleSeries[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly seriesFilter = signal('');
  readonly filteredSeries = computed(() => {
    const q = this.seriesFilter().trim().toLowerCase();
    const list = this.allSeries();
    return q ? list.filter((s) => `${s.clientName} ${s.title}`.toLowerCase().includes(q)) : list;
  });

  readonly preview = signal<SeriesPreview | null>(null);
  readonly result = signal<PublishResult | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly stateFilter = signal<OccurrenceState | ''>('');
  private published = false;

  readonly stateClass = occurrenceStateClass;
  readonly stateLabel = occurrenceStateLabel;
  readonly patternLabel = patternLabel;
  readonly fmtDate = formatDateOnly;
  readonly wallDate = wallDate;
  readonly wallTime = wallTime;

  readonly rows = computed(() => {
    const f = this.stateFilter();
    const occ = this.preview()?.occurrences ?? [];
    return f ? occ.filter((o) => o.state === f) : occ;
  });

  readonly counts = computed(() => {
    const occ = this.preview()?.occurrences ?? [];
    const c: Record<string, number> = { New: 0, Published: 0, Warning: 0, Conflict: 0, OpenShift: 0 };
    for (const o of occ) c[o.state] = (c[o.state] ?? 0) + 1;
    return c;
  });

  /** Occurrences that publishing would create. */
  readonly toCreate = computed(() => {
    const c = this.counts();
    return c['New'] + c['Warning'] + c['OpenShift'];
  });

  readonly rangeError = computed(() => {
    const f = this.from();
    const t = this.to();
    if (!f || !t) return 'Choose both dates.';
    if (f < this.today) return 'Publishing starts today at the earliest.';
    if (t < f) return 'The end date is before the start date.';
    if (t > addDaysDateOnly(f, MAX_DAYS - 1)) return 'Publish at most 8 weeks at a time.';
    return '';
  });

  constructor() {
    this.clientSearch$.pipe(debounceTime(300)).subscribe((q) => this.runClientSearch(q));
  }

  ngOnInit(): void {
    const preset = this.presetSeriesIds();
    if (preset?.length) this.selected.set(new Set(preset));
    this.service.list({ status: 'All', page: 1, pageSize: 200 }).subscribe({
      next: (r) => this.allSeries.set(r.items.filter((s) => s.status !== 'Ended')),
      error: () => this.allSeries.set([]),
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.busy()) this.closed.emit(this.published);
  }

  close(): void {
    this.closed.emit(this.published);
  }

  // ------------------------------------------------------------- Scope

  onClientQuery(q: string): void {
    this.clientQuery.set(q);
    this.clientId.set(null);
    this.clientSearch$.next(q);
    this.invalidate();
  }

  private runClientSearch(q: string): void {
    if (!q.trim()) {
      this.clientOptions.set([]);
      this.clientPickerOpen.set(false);
      return;
    }
    this.clients.list(1, 8, { status: 'Active', search: q.trim() }).subscribe({
      next: (res) => {
        this.clientOptions.set(res.items);
        this.clientPickerOpen.set(true);
      },
      error: () => this.clientOptions.set([]),
    });
  }

  selectClient(c: Client): void {
    this.clientId.set(c.clientId);
    this.clientQuery.set(c.fullName);
    this.clientPickerOpen.set(false);
    this.invalidate();
  }

  toggleSeries(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    this.invalidate();
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  selectAllVisible(on: boolean): void {
    const next = new Set(this.selected());
    for (const s of this.filteredSeries()) {
      if (on) next.add(s.seriesId);
      else next.delete(s.seriesId);
    }
    this.selected.set(next);
    this.invalidate();
  }

  /** Any input change throws away the old preview. */
  invalidate(): void {
    this.preview.set(null);
    this.result.set(null);
    this.error.set('');
  }

  setRange(weeks: number): void {
    this.from.set(this.today);
    this.to.set(addDaysDateOnly(this.today, weeks * 7 - 1));
    this.invalidate();
  }

  private request(): PublishRequest | null {
    if (this.rangeError()) {
      this.error.set(this.rangeError());
      return null;
    }
    if (this.scope() === 'client') {
      if (this.clientId() == null) {
        this.error.set('Choose a client.');
        return null;
      }
      return {
        from: this.from(),
        to: this.to(),
        seriesIds: null,
        clientId: this.clientId(),
        openShiftOnCaregiverConflict: this.openShiftOnConflict(),
      };
    }
    const ids = [...this.selected()];
    if (!ids.length) {
      this.error.set('Select at least one master schedule.');
      return null;
    }
    return {
      from: this.from(),
      to: this.to(),
      seriesIds: ids,
      clientId: null,
      openShiftOnCaregiverConflict: this.openShiftOnConflict(),
    };
  }

  runPreview(): void {
    this.error.set('');
    this.result.set(null);
    const req = this.request();
    if (!req) return;
    this.busy.set(true);
    this.service.preview(req).subscribe({
      next: (p) => {
        this.preview.set(p);
        this.stateFilter.set('');
        this.busy.set(false);
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not preview.');
      },
    });
  }

  publish(): void {
    this.error.set('');
    const req = this.request();
    if (!req) return;
    this.busy.set(true);
    this.service.publish(req).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.result.set(r);
        this.published = this.published || r.created > 0;
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not publish.');
      },
    });
  }
}
