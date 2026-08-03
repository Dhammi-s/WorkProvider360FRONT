/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Invoice } from '../../../core/models/accounting.model';
import { RoleName } from '../../../core/models/role.model';
import { Schedule } from '../../../core/models/scheduler.model';
import { UserDto } from '../../../core/models/user.model';
import { AccountingService } from '../../../core/services/accounting.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { UserService } from '../../../core/services/user.service';
import { StatCard } from '../../../shared/ui/stat-card/stat-card';

interface Stat {
  label: string;
  value: string;
  delta?: string;
  icon: string;
  tone: 'brand' | 'accent' | 'amber' | 'slate';
}

interface DonutSegment {
  label: string;
  count: number;
  color: string;
  dash: number;
  offset: number;
  pct: number;
}

interface Bar {
  label: string;
  value: number;
  pct: number;
  caption?: string;
  color?: string;
}

/** Vibrant per-weekday palette for the shifts chart. */
const BAR_COLORS = ['#6366f1', '#34d399', '#f472b6', '#f59e0b', '#22d3ee', '#a78bfa', '#fb7185'];

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#818cf8',
  Accepted: '#6366f1',
  InProgress: '#f59e0b',
  Completed: '#10b981',
  Rejected: '#ef4444',
  Cancelled: '#94a3b8',
};

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: '#4f46e5',
  Admin: '#6366f1',
  Manager: '#f59e0b',
  User: '#34d399',
};

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Modern, data-driven landing dashboard: KPIs + charts across the workspace's modules. */
@Component({
  selector: 'app-dashboard-home',
  imports: [StatCard, RouterLink],
  templateUrl: './home.html',
})
export class DashboardHome {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly scheduler = inject(SchedulerService);
  private readonly applications = inject(ApplicationService);
  private readonly accounting = inject(AccountingService);

  readonly user = this.auth.user;
  readonly radius = RADIUS;
  readonly circumference = CIRCUMFERENCE;

  readonly role = computed<RoleName>(() => (this.auth.roleName() ?? 'User') as RoleName);
  readonly isSuperAdmin = computed(() => this.role() === 'SuperAdmin');
  readonly isAdmin = computed(() => this.role() === 'SuperAdmin' || this.role() === 'Admin');
  readonly firstName = computed(() => this.user()?.fullName?.split(' ')[0] ?? '');

  readonly headline = computed(() => {
    switch (this.role()) {
      case 'SuperAdmin':
        return 'Full control of your workspace and team.';
      case 'Admin':
        return 'Manage your team and keep operations running.';
      case 'Manager':
        return 'Track your team’s jobs and performance.';
      default:
        return 'Here’s what’s happening with your work today.';
    }
  });

  // ---- Raw data ----
  private readonly team = signal<UserDto[]>([]);
  private readonly shifts = signal<Schedule[]>([]);
  private readonly pendingApps = signal(0);
  private readonly invoices = signal<Invoice[]>([]);

  constructor() {
    const now = new Date();
    const monday = startOfWeek(now);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59);
    this.scheduler.list(isoLocal(monday), isoLocal(sunday)).subscribe({
      next: (rows) => this.shifts.set(rows),
      error: () => this.shifts.set([]),
    });

    if (this.isAdmin()) {
      this.users.getUsers().subscribe({
        next: (list) => this.team.set(list),
        error: () => this.team.set([]),
      });
      this.applications.list('Pending').subscribe({
        next: (list) => this.pendingApps.set(list.length),
        error: () => this.pendingApps.set(0),
      });
    }

    if (this.isSuperAdmin()) {
      this.accounting.list().subscribe({
        next: (list) => this.invoices.set(list),
        error: () => this.invoices.set([]),
      });
    }
  }

  // ---- KPI tiles ----
  readonly stats = computed<Stat[]>(() => {
    const shifts = this.shifts();
    const hours = Math.round(shifts.reduce((sum, s) => sum + hoursBetween(s.startUtc, s.endUtc), 0));

    if (this.isAdmin()) {
      const revenue = this.invoices().reduce((sum, i) => sum + i.amount, 0);
      return [
        { label: 'Team Members', value: String(this.team().length), delta: 'live', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z', tone: 'brand' },
        { label: 'Shifts This Week', value: String(shifts.length), delta: `${hours}h`, icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', tone: 'accent' },
        { label: 'Pending Applications', value: String(this.pendingApps()), delta: 'review', icon: 'M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z', tone: 'amber' },
        this.isSuperAdmin()
          ? { label: 'Revenue (paid)', value: money(revenue), delta: `${this.invoices().length} inv`, icon: 'M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 12v-2', tone: 'slate' }
          : { label: 'Hours This Week', value: `${hours}h`, delta: 'scheduled', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tone: 'slate' },
      ];
    }

    const mine = shifts;
    const completed = mine.filter((s) => s.status === 'Completed').length;
    const upcoming = mine.filter((s) => new Date(parseLocalTs(s.startUtc)) >= new Date()).length;
    return [
      { label: 'My Shifts This Week', value: String(mine.length), delta: 'assigned', icon: 'M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', tone: 'brand' },
      { label: 'Completed', value: String(completed), delta: 'done', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', tone: 'accent' },
      { label: 'Upcoming', value: String(upcoming), icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z', tone: 'amber' },
      { label: 'Hours This Week', value: `${hours}h`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tone: 'slate' },
    ];
  });

  // ---- Shifts per weekday (bar) ----
  readonly shiftsPerDay = computed<Bar[]>(() => {
    const counts = new Array(7).fill(0);
    for (const s of this.shifts()) {
      const d = new Date(parseLocalTs(s.startUtc));
      const idx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
      counts[idx]++;
    }
    const max = Math.max(1, ...counts);
    return WEEKDAYS.map((label, i) => ({
      label,
      value: counts[i],
      pct: Math.round((counts[i] / max) * 100),
      color: BAR_COLORS[i],
    }));
  });

  // ---- Shifts by status (donut) ----
  readonly statusDonut = computed<DonutSegment[]>(() => {
    const map = new Map<string, number>();
    for (const s of this.shifts()) map.set(s.status, (map.get(s.status) ?? 0) + 1);
    return this.buildDonut([...map.entries()].map(([k, v]) => ({ key: k, label: k, count: v, color: STATUS_COLORS[k] ?? '#94a3b8' })));
  });

  // ---- Team by role (donut) ----
  readonly roleDonut = computed<DonutSegment[]>(() => {
    const map = new Map<string, number>();
    for (const u of this.team()) map.set(u.roleName, (map.get(u.roleName) ?? 0) + 1);
    return this.buildDonut([...map.entries()].map(([k, v]) => ({ key: k, label: roleLabel(k), count: v, color: ROLE_COLORS[k] ?? '#94a3b8' })));
  });

  // ---- Revenue, last 5 weeks (bar) — SuperAdmin ----
  readonly revenueBars = computed<Bar[]>(() => {
    const now = new Date();
    const weeks: Bar[] = [];
    const totals: number[] = [];
    for (let w = 4; w >= 0; w--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
      const total = this.invoices().reduce((sum, i) => {
        const paid = new Date(i.paidOn ?? i.createdOn);
        return paid >= start && paid <= end ? sum + i.amount : sum;
      }, 0);
      totals.push(total);
      weeks.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, value: total, pct: 0, caption: money(total) });
    }
    const max = Math.max(1, ...totals);
    return weeks.map((b) => ({ ...b, pct: Math.round((b.value / max) * 100) }));
  });

  readonly totalRevenue = computed(() => this.invoices().reduce((sum, i) => sum + i.amount, 0));

  // ---- Upcoming shifts list ----
  readonly upcomingShifts = computed(() =>
    [...this.shifts()]
      .filter((s) => new Date(parseLocalTs(s.endUtc)) >= new Date())
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
      .slice(0, 6),
  );

  statusBadge(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700';
      case 'InProgress':
        return 'bg-amber-50 text-amber-700';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-50 text-red-700';
      case 'Accepted':
        return 'bg-brand-50 text-brand-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  private buildDonut(items: { key: string; label: string; count: number; color: string }[]): DonutSegment[] {
    const total = items.reduce((sum, i) => sum + i.count, 0);
    if (total === 0) return [];
    let offset = 0;
    return items.map((i) => {
      const pct = i.count / total;
      const dash = pct * CIRCUMFERENCE;
      const seg: DonutSegment = { label: i.label, count: i.count, color: i.color, dash, offset: -offset, pct: Math.round(pct * 100) };
      offset += dash;
      return seg;
    });
  }
}

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // days since Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Schedules carry naive local timestamps (no Z); parse them as local wall-clock. */
function parseLocalTs(value: string): string {
  return value.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
}

function hoursBetween(startUtc: string, endUtc: string): number {
  const ms = new Date(parseLocalTs(endUtc)).getTime() - new Date(parseLocalTs(startUtc)).getTime();
  return Math.max(0, ms / 3_600_000);
}

function money(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function roleLabel(role: string): string {
  return role === 'User' ? 'Team Member' : role === 'SuperAdmin' ? 'Super Admin' : role;
}
