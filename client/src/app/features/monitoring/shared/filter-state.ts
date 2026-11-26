/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { signal } from '@angular/core';

export type RangeKey = '15m' | '1h' | '24h' | '7d' | 'custom';

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '15m', label: 'Last 15 minutes' },
  { key: '1h', label: 'Last hour' },
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: 'custom', label: 'Custom range' },
];

export const AUTO_REFRESH_OPTIONS: { seconds: number; label: string }[] = [
  { seconds: 0, label: 'Off' },
  { seconds: 10, label: '10 s' },
  { seconds: 30, label: '30 s' },
  { seconds: 60, label: '1 min' },
  { seconds: 300, label: '5 min' },
];

const RANGE_MS: Record<Exclude<RangeKey, 'custom'>, number> = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
};

/**
 * Shared time-range / tenant / auto-refresh state for a monitoring page. The filter bar
 * mutates it and bumps `version`; pages re-load whenever `version` changes.
 */
export class FilterState {
  readonly range = signal<RangeKey>('24h');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly tenantId = signal<number | null>(null);
  readonly autoSeconds = signal(0);
  readonly version = signal(0);

  constructor(opts?: { range?: RangeKey; autoSeconds?: number }) {
    if (opts?.range) this.range.set(opts.range);
    if (opts?.autoSeconds) this.autoSeconds.set(opts.autoSeconds);
  }

  bump(): void {
    this.version.update((v) => v + 1);
  }

  /** Resolve the current selection to ISO-8601 UTC bounds. */
  resolve(): { from: string; to: string } {
    const key = this.range();
    const now = new Date();
    if (key === 'custom') {
      const f = new Date(this.customFrom());
      const t = new Date(this.customTo());
      if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f < t) {
        return { from: f.toISOString(), to: t.toISOString() };
      }
      // Incomplete custom range: fall back to the last 24h.
      return { from: new Date(now.getTime() - RANGE_MS['24h']).toISOString(), to: now.toISOString() };
    }
    return { from: new Date(now.getTime() - RANGE_MS[key]).toISOString(), to: now.toISOString() };
  }

  /** Query params for analytics endpoints. */
  params(includeTenant = true): Record<string, string | number | undefined> {
    const { from, to } = this.resolve();
    const tenant = this.tenantId();
    return { from, to, tenantId: includeTenant && tenant ? tenant : undefined };
  }
}
