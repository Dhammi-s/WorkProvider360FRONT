import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { SecurityStats } from '../../../core/models/security.model';
import { SecurityService } from '../../../core/services/security.service';
import { exportSecurityPdf } from '../../../shared/util/security-pdf.util';
import { Alert } from '../../../shared/ui/alert/alert';

interface DonutSegment {
  label: string;
  count: number;
  color: string;
  dash: number;
  offset: number;
  pct: number;
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  LoginSuccess: { label: 'Successful login', color: '#10b981' },
  LoginFailed: { label: 'Failed login', color: '#ef4444' },
  Unauthorized: { label: 'Unauthorized access', color: '#f59e0b' },
  SqlInjection: { label: 'SQL injection', color: '#8b5cf6' },
  DosAttempt: { label: 'DoS / rate abuse', color: '#f43f5e' },
};

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** SuperAdmin security dashboard: login analytics + detected attacks, with PDF export. */
@Component({
  selector: 'app-security',
  imports: [DatePipe, Alert],
  templateUrl: './security.html',
})
export class Security {
  private readonly service = inject(SecurityService);

  readonly stats = signal<SecurityStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly exporting = signal(false);

  readonly circumference = CIRCUMFERENCE;
  readonly radius = RADIUS;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load security data.');
        this.loading.set(false);
      },
    });
  }

  /** Donut segments for the "events by type" chart. */
  readonly donut = computed<DonutSegment[]>(() => {
    const counts = this.stats()?.typeCounts ?? [];
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return [];
    let offset = 0;
    return counts.map((c) => {
      const pct = c.count / total;
      const dash = pct * CIRCUMFERENCE;
      const seg: DonutSegment = {
        label: this.typeLabel(c.eventType),
        count: c.count,
        color: TYPE_META[c.eventType]?.color ?? '#94a3b8',
        dash,
        offset: -offset,
        pct: Math.round(pct * 100),
      };
      offset += dash;
      return seg;
    });
  });

  /** Max login count across accounts, for bar scaling. */
  readonly maxLogin = computed(() => {
    const rows = this.stats()?.loginStats ?? [];
    return Math.max(1, ...rows.map((r) => r.successCount + r.failedCount));
  });

  barPct(value: number): number {
    return Math.round((value / this.maxLogin()) * 100);
  }

  typeLabel(type: string): string {
    return TYPE_META[type]?.label ?? type;
  }

  typeColor(type: string): string {
    return TYPE_META[type]?.color ?? '#94a3b8';
  }

  badgeClass(type: string): string {
    switch (type) {
      case 'LoginSuccess':
        return 'bg-emerald-50 text-emerald-700';
      case 'LoginFailed':
        return 'bg-red-50 text-red-700';
      case 'Unauthorized':
        return 'bg-amber-50 text-amber-700';
      case 'SqlInjection':
        return 'bg-violet-50 text-violet-700';
      case 'DosAttempt':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  async exportPdf(): Promise<void> {
    const s = this.stats();
    if (!s) return;
    this.exporting.set(true);
    try {
      await exportSecurityPdf(s);
    } finally {
      this.exporting.set(false);
    }
  }
}
