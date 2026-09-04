/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ClientVisit } from '../../../core/models/portal.model';

interface Day {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  visits: ClientVisit[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * A month calendar of visits. Input-driven and reusable: give it a list of
 * visits and it lays them out by day; clicking a visit emits it. Navigation is
 * local; the host can react to monthChange to fetch a different range.
 */
@Component({
  selector: 'app-visit-calendar',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="flex items-center justify-between">
      <span class="text-sm font-bold text-slate-700">{{ monthLabel() }}</span>
      <div class="flex items-center rounded-xl border border-slate-200 bg-white">
        <button type="button" (click)="shift(-1)" class="px-3 py-1.5 text-slate-500 hover:text-slate-800" aria-label="Previous month">‹</button>
        <button type="button" (click)="reset()" class="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">Today</button>
        <button type="button" (click)="shift(1)" class="px-3 py-1.5 text-slate-500 hover:text-slate-800" aria-label="Next month">›</button>
      </div>
    </div>

    <div class="mt-2 overflow-hidden rounded-xl border border-slate-100">
      <div class="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        @for (d of weekdays; track d) { <div class="py-1.5">{{ d }}</div> }
      </div>
      @for (week of weeks(); track $index) {
        <div class="grid grid-cols-7">
          @for (day of week; track day.date.getTime()) {
            <div class="min-h-[76px] border-b border-r border-slate-100 p-1 last:border-r-0"
                 [class]="day.inMonth ? 'bg-white' : 'bg-slate-50/60'">
              <span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold"
                    [class]="day.isToday ? 'bg-brand-600 text-white' : (day.inMonth ? 'text-slate-500' : 'text-slate-300')">{{ day.date.getDate() }}</span>
              <div class="mt-0.5 space-y-0.5">
                @for (v of day.visits; track v.scheduleId) {
                  <button type="button" (click)="visitSelected.emit(v)"
                          class="flex w-full items-center gap-1 truncate rounded bg-brand-50 px-1 py-0.5 text-left text-[10px] font-medium text-brand-800 hover:bg-brand-100">
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="dot(v.status)"></span>
                    <span class="truncate">{{ v.startUtc | date: 'HH:mm' }} {{ v.serviceTypeName || v.title }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class VisitCalendar {
  readonly visits = input<ClientVisit[]>([]);
  readonly visitSelected = output<ClientVisit>();
  readonly monthChange = output<{ fromUtc: string; toUtc: string }>();

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly anchor = signal(startOfMonth(new Date()));

  readonly monthLabel = computed(() =>
    this.anchor().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  readonly weeks = computed<Day[][]>(() => {
    const first = this.anchor();
    const start = new Date(first);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    const byDay = new Map<string, ClientVisit[]>();
    for (const v of this.visits()) {
      const d = new Date(v.startUtc);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(v);
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const weeks: Day[][] = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: Day[] = [];
      for (let d = 0; d < 7; d++) {
        const key = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
        row.push({
          date: new Date(cursor),
          inMonth: cursor.getMonth() === first.getMonth(),
          isToday: key === todayKey,
          visits: (byDay.get(key) ?? []).sort((a, b) => a.startUtc.localeCompare(b.startUtc)),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(row);
    }
    return weeks;
  });

  shift(delta: number): void {
    const a = new Date(this.anchor());
    a.setMonth(a.getMonth() + delta);
    this.anchor.set(startOfMonth(a));
    this.emitRange();
  }

  reset(): void {
    this.anchor.set(startOfMonth(new Date()));
    this.emitRange();
  }

  dot(status: string): string {
    switch (status) {
      case 'Completed': return 'bg-emerald-500';
      case 'InProgress': return 'bg-amber-500';
      case 'Cancelled':
      case 'Rejected': return 'bg-red-500';
      default: return 'bg-brand-500';
    }
  }

  private emitRange(): void {
    const from = startOfMonth(this.anchor());
    from.setDate(from.getDate() - 7);
    const to = startOfMonth(this.anchor());
    to.setMonth(to.getMonth() + 1);
    to.setDate(to.getDate() + 7);
    this.monthChange.emit({ fromUtc: iso(from), toUtc: iso(to) });
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00`;
}
