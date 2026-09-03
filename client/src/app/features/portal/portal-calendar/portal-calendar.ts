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
import { ClientVisit } from '../../../core/models/portal.model';
import { Alert } from '../../../shared/ui/alert/alert';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  visits: ClientVisit[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

@Component({
  selector: 'app-portal-calendar',
  imports: [DatePipe, Alert],
  templateUrl: './portal-calendar.html',
})
export class PortalCalendar {
  private readonly portal = inject(PortalService);

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly anchor = signal(startOfMonth(new Date()));
  readonly visits = signal<ClientVisit[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selected = signal<CalendarDay | null>(null);

  readonly monthLabel = computed(() =>
    this.anchor().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  readonly weeks = computed<CalendarDay[][]>(() => {
    const first = this.anchor();
    // Grid starts on Monday of the week containing the 1st.
    const start = new Date(first);
    const offset = (start.getDay() + 6) % 7; // 0=Mon
    start.setDate(start.getDate() - offset);

    const byDay = new Map<string, ClientVisit[]>();
    for (const v of this.visits()) {
      const d = new Date(v.startUtc);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const list = byDay.get(key) ?? [];
      list.push(v);
      byDay.set(key, list);
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const weeks: CalendarDay[][] = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: CalendarDay[] = [];
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

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const from = startOfMonth(this.anchor());
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    // Widen the range so leading/trailing grid days are covered.
    const fromWide = new Date(from);
    fromWide.setDate(fromWide.getDate() - 7);
    const toWide = new Date(to);
    toWide.setDate(toWide.getDate() + 7);
    this.portal.visits(undefined, isoLocal(fromWide), isoLocal(toWide)).subscribe({
      next: (v) => {
        this.visits.set(v);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load your calendar.');
        this.loading.set(false);
      },
    });
  }

  prevMonth(): void {
    const a = new Date(this.anchor());
    a.setMonth(a.getMonth() - 1);
    this.anchor.set(startOfMonth(a));
    this.selected.set(null);
    this.load();
  }

  nextMonth(): void {
    const a = new Date(this.anchor());
    a.setMonth(a.getMonth() + 1);
    this.anchor.set(startOfMonth(a));
    this.selected.set(null);
    this.load();
  }

  today(): void {
    this.anchor.set(startOfMonth(new Date()));
    this.selected.set(null);
    this.load();
  }

  selectDay(day: CalendarDay): void {
    this.selected.set(day.visits.length ? day : null);
  }

  closeDay(): void {
    this.selected.set(null);
  }

  statusDot(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500';
      case 'InProgress':
        return 'bg-amber-500';
      case 'Cancelled':
      case 'Rejected':
        return 'bg-red-500';
      default:
        return 'bg-portal-500';
    }
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00`;
}
