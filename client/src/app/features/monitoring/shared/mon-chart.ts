/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface ChartSeries {
  label: string;
  data: number[];
  /** Single colour (line/bar). */
  color?: string;
  /** Per-point colours (doughnut, or multi-colour bars). */
  colors?: string[];
  fill?: boolean;
}

export const CHART_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#14b8a6', '#f97316', '#64748b', '#ec4899'];

/** Small reusable wrapper around Chart.js (line, bar, doughnut). */
@Component({
  selector: 'mon-chart',
  template: `
    <div class="relative w-full" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel()"></canvas>
    </div>
  `,
})
export class MonChart {
  readonly type = input<'line' | 'bar' | 'doughnut'>('line');
  readonly labels = input<string[]>([]);
  readonly datasets = input<ChartSeries[]>([]);
  /** Horizontal bars. */
  readonly horizontal = input(false);
  readonly stacked = input(false);
  readonly height = input(260);
  readonly ariaLabel = input('Chart');
  /** Tooltip / tick value suffix, e.g. " ms". */
  readonly unit = input('');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
    effect(() => {
      const type = this.type();
      const labels = this.labels();
      const series = this.datasets();
      const horizontal = this.horizontal();
      const stacked = this.stacked();
      const unit = this.unit();
      const el = this.canvas().nativeElement;
      this.render(el, type, labels, series, horizontal, stacked, unit);
    });
  }

  private render(
    el: HTMLCanvasElement,
    type: 'line' | 'bar' | 'doughnut',
    labels: string[],
    series: ChartSeries[],
    horizontal: boolean,
    stacked: boolean,
    unit: string,
  ): void {
    this.chart?.destroy();
    const isDoughnut = type === 'doughnut';
    const datasets = series.map((s, i) => {
      const color = s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
      if (isDoughnut) {
        return {
          label: s.label,
          data: s.data,
          backgroundColor: s.colors ?? labels.map((_, k) => CHART_PALETTE[k % CHART_PALETTE.length]),
          borderWidth: 2,
          borderColor: '#ffffff',
        };
      }
      if (type === 'line') {
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          backgroundColor: color + '22',
          fill: s.fill ?? false,
          tension: 0.3,
          pointRadius: s.data.length > 60 ? 0 : 2,
          pointHoverRadius: 4,
          borderWidth: 2,
        };
      }
      return {
        label: s.label,
        data: s.data,
        backgroundColor: s.colors ?? color,
        borderRadius: 4,
        maxBarThickness: 36,
      };
    });

    const config = {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        indexAxis: type === 'bar' && horizontal ? 'y' : 'x',
        interaction: { mode: isDoughnut ? 'nearest' : 'index', intersect: false },
        plugins: {
          legend: {
            display: isDoughnut || datasets.length > 1,
            position: isDoughnut ? 'right' : 'bottom',
            labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx: { dataset: { label?: string }; parsed: unknown; formattedValue: string }) =>
                `${ctx.dataset.label ?? ''}: ${ctx.formattedValue}${unit}`,
            },
          },
        },
        ...(isDoughnut
          ? { cutout: '62%' }
          : {
              scales: {
                x: {
                  stacked,
                  grid: { display: horizontal, color: '#f1f5f9' },
                  ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: horizontal ? 6 : 10 },
                },
                y: {
                  stacked,
                  beginAtZero: true,
                  grid: { color: '#f1f5f9' },
                  ticks: { font: { size: 10 } },
                },
              },
            }),
      },
    } as unknown as ChartConfiguration;

    this.chart = new Chart(el, config);
  }
}
