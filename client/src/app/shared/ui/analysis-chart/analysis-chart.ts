/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-22
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { AnalysisChart, AnalysisSeries } from '../../../core/models/analysis.model';

const W = 600;
const H = 220;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;
const CIRC = 2 * Math.PI * 52;

interface Slice {
  label: string;
  value: number;
  color: string;
  pct: number;
  dash: number;
  offset: number;
}

function fmt(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 10_000) return `${(v / 1_000).toFixed(0)}k`;
  if (a >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

/** Dependency-free SVG chart for AI Analysis reports: line (with forecast band), bar, hbar, pie, donut. */
@Component({
  selector: 'app-analysis-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full flex-col">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h4 class="truncate text-sm font-bold text-slate-800">{{ chart().title }}</h4>
          @if (chart().subtitle) { <p class="text-[11px] text-slate-400">{{ chart().subtitle }}</p> }
        </div>
        @if (chart().type === 'line') {
          <div class="flex shrink-0 items-center gap-3 text-[11px] text-slate-500">
            <span class="flex items-center gap-1"><span class="h-0.5 w-4 rounded" [style.background]="lineColor()"></span>Actual</span>
            <span class="flex items-center gap-1"><span class="h-0 w-4 border-t-2 border-dashed" [style.border-color]="lineColor()"></span>Forecast</span>
          </div>
        }
      </div>

      @switch (chart().type) {
        @case ('line') {
          <div class="relative mt-2">
            <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full" role="img" [attr.aria-label]="chart().title"
              (mousemove)="hover($event)" (mouseleave)="hoverIndex.set(null)">
              <defs>
                <linearGradient [attr.id]="gradId" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" [attr.stop-color]="lineColor()" stop-opacity="0.22" />
                  <stop offset="100%" [attr.stop-color]="lineColor()" stop-opacity="0" />
                </linearGradient>
              </defs>
              @for (g of grid(); track g.y) {
                <line [attr.x1]="PAD_L" [attr.x2]="W - PAD_R" [attr.y1]="g.y" [attr.y2]="g.y" stroke="#f1f5f9" />
                <text [attr.x]="PAD_L - 6" [attr.y]="g.y + 3" font-size="10" text-anchor="end" fill="#94a3b8">{{ g.label }}</text>
              }
              @if (forecastX() !== null) {
                <rect [attr.x]="forecastX()" [attr.y]="PAD_T" [attr.width]="W - PAD_R - forecastX()!" [attr.height]="H - PAD_T - PAD_B" fill="#eef2ff" opacity="0.6" rx="6" />
                <text [attr.x]="forecastX()! + 6" [attr.y]="PAD_T + 12" font-size="10" fill="#6366f1" font-weight="600">Forecast</text>
              }
              @if (band()) { <polygon [attr.points]="band()" [attr.fill]="lineColor()" opacity="0.12" /> }
              @if (area()) { <polygon [attr.points]="area()" [attr.fill]="'url(#' + gradId + ')'" /> }
              @for (l of lines(); track l.name) {
                <polyline [attr.points]="l.points" fill="none" [attr.stroke]="l.color" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
                  [attr.stroke-dasharray]="l.dashed ? '6 5' : null" />
              }
              @for (t of xTicks(); track t.i) {
                <text [attr.x]="t.x" [attr.y]="H - 8" font-size="10" text-anchor="middle" fill="#94a3b8">{{ t.label }}</text>
              }
              @if (hoverPoint(); as hp) {
                <line [attr.x1]="hp.x" [attr.x2]="hp.x" [attr.y1]="PAD_T" [attr.y2]="H - PAD_B" stroke="#cbd5e1" stroke-dasharray="3 3" />
                @for (d of hp.dots; track d.name) { <circle [attr.cx]="hp.x" [attr.cy]="d.y" r="4" [attr.fill]="d.color" stroke="#fff" stroke-width="2" /> }
              }
            </svg>
            @if (hoverPoint(); as hp) {
              <div class="pointer-events-none absolute top-1 z-10 rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-[11px] text-white shadow-lg"
                [style.left.%]="hp.leftPct" [style.transform]="hp.leftPct > 60 ? 'translateX(-105%)' : 'translateX(8px)'">
                <p class="font-semibold">{{ hp.label }}</p>
                @for (d of hp.dots; track d.name) { <p>{{ d.name }}: <b>{{ d.text }}</b> {{ chart().unit === '$' ? '' : chart().unit }}</p> }
              </div>
            }
          </div>
        }

        @case ('bar') {
          <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="mt-2 w-full" role="img" [attr.aria-label]="chart().title">
            @for (g of grid(); track g.y) {
              <line [attr.x1]="PAD_L" [attr.x2]="W - PAD_R" [attr.y1]="g.y" [attr.y2]="g.y" stroke="#f1f5f9" />
              <text [attr.x]="PAD_L - 6" [attr.y]="g.y + 3" font-size="10" text-anchor="end" fill="#94a3b8">{{ g.label }}</text>
            }
            @for (b of bars(); track b.key) {
              <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="4" [attr.fill]="b.color" class="transition-opacity hover:opacity-80">
                <title>{{ b.title }}</title>
              </rect>
            }
            @for (t of barLabels(); track t.i) {
              <text [attr.x]="t.x" [attr.y]="H - 8" font-size="10" text-anchor="middle" fill="#94a3b8">{{ t.label }}</text>
            }
          </svg>
          @if (chart().series.length > 1) {
            <div class="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
              @for (s of chart().series; track s.name) { <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm" [style.background]="s.color"></span>{{ s.name }}</span> }
            </div>
          }
        }

        @case ('hbar') {
          <ul class="mt-3 space-y-2.5">
            @for (r of hbars(); track r.label) {
              <li class="text-xs">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-slate-600">{{ r.label }}</span>
                  <span class="shrink-0 font-semibold text-slate-900">{{ r.text }}</span>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full transition-all duration-700" [style.width.%]="r.pct" [style.background]="r.color"></div>
                </div>
              </li>
            } @empty {
              <li class="py-8 text-center text-xs text-slate-400">No data yet.</li>
            }
          </ul>
        }

        @default {
          <!-- pie / donut -->
          <div class="mt-3 flex items-center gap-5">
            <svg viewBox="0 0 160 160" class="h-36 w-36 shrink-0 -rotate-90">
              @if (chart().type === 'donut') {
                <circle cx="80" cy="80" r="52" fill="none" stroke="#f1f5f9" stroke-width="20" />
                @for (s of slices(); track s.label) {
                  <circle cx="80" cy="80" r="52" fill="none" [attr.stroke]="s.color" stroke-width="20"
                    [attr.stroke-dasharray]="s.dash + ' ' + (CIRC - s.dash)" [attr.stroke-dashoffset]="s.offset"><title>{{ s.label }}: {{ s.value }}</title></circle>
                }
              } @else {
                <circle cx="80" cy="80" r="70" fill="#f1f5f9" />
                @for (s of pieSlices(); track s.label) {
                  <circle cx="80" cy="80" r="35" fill="none" [attr.stroke]="s.color" stroke-width="70"
                    [attr.stroke-dasharray]="s.dash + ' ' + (pieCirc - s.dash)" [attr.stroke-dashoffset]="s.offset"><title>{{ s.label }}: {{ s.value }}</title></circle>
                }
              }
            </svg>
            <ul class="min-w-0 flex-1 space-y-1.5">
              @if (chart().type === 'donut') {
                <li class="mb-2 text-2xl font-extrabold text-slate-900">{{ totalText() }} <span class="text-xs font-medium text-slate-400">total</span></li>
              }
              @for (s of slices(); track s.label) {
                <li class="flex items-center gap-2 text-xs">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" [style.background]="s.color"></span>
                  <span class="flex-1 truncate text-slate-600">{{ s.label }}</span>
                  <span class="font-semibold text-slate-900">{{ fmt(s.value) }}</span>
                  <span class="w-10 text-right text-slate-400">{{ s.pct }}%</span>
                </li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
})
export class AnalysisChartView {
  readonly chart = input.required<AnalysisChart>();

  protected readonly W = W;
  protected readonly H = H;
  protected readonly PAD_L = PAD_L;
  protected readonly PAD_R = PAD_R;
  protected readonly PAD_T = PAD_T;
  protected readonly PAD_B = PAD_B;
  protected readonly CIRC = CIRC;
  protected readonly pieCirc = 2 * Math.PI * 35;
  protected readonly fmt = fmt;
  protected readonly gradId = `ag-${Math.random().toString(36).slice(2, 9)}`;
  protected readonly hoverIndex = signal<number | null>(null);

  private readonly plotSeries = computed<AnalysisSeries[]>(() => this.chart().series.filter((s) => !s.isBand));

  private readonly max = computed(() => {
    let m = 0;
    for (const s of this.chart().series) for (const v of s.values) if (v != null && v > m) m = v;
    return m > 0 ? m * 1.08 : 1;
  });

  protected readonly lineColor = computed(() => this.plotSeries()[0]?.color ?? '#4f46e5');

  private x(i: number): number {
    const n = Math.max(2, this.chart().labels.length);
    return PAD_L + ((W - PAD_L - PAD_R) * i) / (n - 1);
  }

  private y(v: number): number {
    return PAD_T + (H - PAD_T - PAD_B) * (1 - v / this.max());
  }

  protected readonly grid = computed(() =>
    [0, 1, 2, 3, 4].map((g) => {
      const y = PAD_T + ((H - PAD_T - PAD_B) * g) / 4;
      return { y, label: fmt((this.max() * (4 - g)) / 4) };
    }),
  );

  protected readonly forecastX = computed(() => {
    const fs = this.chart().forecastStart;
    return fs != null && fs > 0 ? this.x(fs - 1) : null;
  });

  private points(s: AnalysisSeries): string {
    return s.values
      .map((v, i) => (v == null ? null : `${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`))
      .filter((p): p is string => p !== null)
      .join(' ');
  }

  protected readonly lines = computed(() =>
    this.plotSeries().map((s) => ({ name: s.name, color: s.color, dashed: s.isForecast, points: this.points(s) })),
  );

  protected readonly area = computed(() => {
    const actual = this.plotSeries().find((s) => !s.isForecast);
    if (!actual) return '';
    const idx = actual.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    if (idx.length < 2) return '';
    const base = H - PAD_B;
    return `${this.x(idx[0]).toFixed(1)},${base} ${this.points(actual)} ${this.x(idx[idx.length - 1]).toFixed(1)},${base}`;
  });

  protected readonly band = computed(() => {
    const upper = this.chart().series.find((s) => s.isBand && s.name.startsWith('Upper'));
    const lower = this.chart().series.find((s) => s.isBand && s.name.startsWith('Lower'));
    if (!upper || !lower) return '';
    const top = upper.values.map((v, i) => (v == null ? null : `${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`)).filter(Boolean);
    const bottom = lower.values
      .map((v, i) => (v == null ? null : `${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`))
      .filter(Boolean)
      .reverse();
    return top.length > 1 ? [...top, ...bottom].join(' ') : '';
  });

  protected readonly xTicks = computed(() => {
    const labels = this.chart().labels;
    const step = Math.max(1, Math.ceil(labels.length / 7));
    return labels.map((label, i) => ({ i, label, x: this.x(i) })).filter((t) => t.i % step === 0);
  });

  protected readonly hoverPoint = computed(() => {
    const i = this.hoverIndex();
    if (i == null) return null;
    const dots = this.plotSeries()
      .filter((s) => s.values[i] != null)
      .map((s) => ({ name: s.name, color: s.color, y: this.y(s.values[i]!), text: (this.chart().unit === '$' ? '$' : '') + fmt(s.values[i]) }));
    if (!dots.length) return null;
    const x = this.x(i);
    return { x, leftPct: (x / W) * 100, label: this.chart().labels[i], dots };
  });

  hover(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const n = Math.max(2, this.chart().labels.length);
    const i = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1));
    this.hoverIndex.set(i >= 0 && i < this.chart().labels.length ? i : null);
  }

  protected readonly bars = computed(() => {
    const c = this.chart();
    const groups = Math.max(1, c.labels.length);
    const gw = (W - PAD_L - PAD_R) / groups;
    const series = c.series;
    const bw = Math.max(3, (gw * 0.7) / Math.max(1, series.length));
    const out: { key: string; x: number; y: number; w: number; h: number; color: string; title: string }[] = [];
    for (let g = 0; g < groups; g++) {
      series.forEach((s, si) => {
        const v = s.values[g] ?? 0;
        const h = ((H - PAD_T - PAD_B) * v) / this.max();
        out.push({
          key: `${g}-${si}`,
          x: PAD_L + g * gw + gw * 0.15 + si * bw,
          y: H - PAD_B - h,
          w: bw - 2,
          h: Math.max(0, h),
          color: s.colors?.[g] ?? s.color,
          title: `${c.labels[g]} · ${s.name}: ${fmt(v)}`,
        });
      });
    }
    return out;
  });

  protected readonly barLabels = computed(() => {
    const c = this.chart();
    const groups = Math.max(1, c.labels.length);
    const gw = (W - PAD_L - PAD_R) / groups;
    const step = Math.max(1, Math.ceil(groups / 10));
    return c.labels
      .map((label, i) => ({ i, label: label.length > 10 ? label.slice(0, 9) + '…' : label, x: PAD_L + i * gw + gw / 2 }))
      .filter((t) => t.i % step === 0);
  });

  protected readonly hbars = computed(() => {
    const c = this.chart();
    const s = c.series[0];
    if (!s) return [];
    const max = Math.max(1e-9, ...s.values.map((v) => v ?? 0));
    return c.labels.map((label, i) => {
      const v = s.values[i] ?? 0;
      return {
        label,
        pct: Math.max(2, (v / max) * 100),
        color: s.colors?.[i] ?? s.color,
        text: c.unit === '%' ? `${fmt(v)}%` : c.unit === '$' ? `$${fmt(v)}` : fmt(v),
      };
    });
  });

  private buildSlices(circ: number): Slice[] {
    const c = this.chart();
    const s = c.series[0];
    if (!s) return [];
    const values = s.values.map((v) => Math.max(0, v ?? 0));
    const total = values.reduce((a, b) => a + b, 0);
    let offset = 0;
    return c.labels.map((label, i) => {
      const pct = total > 0 ? values[i] / total : 0;
      const dash = pct * circ;
      const slice: Slice = { label, value: values[i], color: s.colors?.[i] ?? s.color, pct: Math.round(pct * 100), dash, offset: -offset };
      offset += dash;
      return slice;
    });
  }

  protected readonly slices = computed(() => this.buildSlices(CIRC));
  protected readonly pieSlices = computed(() => this.buildSlices(this.pieCirc));
  protected readonly totalText = computed(() => fmt(this.slices().reduce((a, s) => a + s.value, 0)));
}
