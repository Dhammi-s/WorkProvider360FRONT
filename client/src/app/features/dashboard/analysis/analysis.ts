/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-22
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AnalysisAccess,
  AnalysisInsight,
  AnalysisModule,
  AnalysisRecipient,
  AnalysisReportSummary,
  AnalysisResult,
  AnalysisSection,
  KpiTone,
} from '../../../core/models/analysis.model';
import { AnalysisService } from '../../../core/services/analysis.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { AnalysisChartView } from '../../../shared/ui/analysis-chart/analysis-chart';
import { Paginator } from '../../../shared/ui/paginator/paginator';
import { downloadPdfDataUri } from '../../../shared/util/invoice-pdf.util';

type View = 'new' | 'report' | 'history';

/** Animated "neural network" shown while the models train. */
interface NetNode {
  x: number;
  y: number;
  layer: number;
}

const PDF_OPTS = {
  margin: 8,
  image: { type: 'jpeg', quality: 0.92 },
  html2canvas: { scale: 1.6, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy'], avoid: ['.card', 'tr', '.chart'] },
};

/**
 * AI Analysis: pick the areas to analyse, run the neural networks, explore the
 * report (charts, risks, forecasts, recommendations), download it as PDF / HTML
 * and e-mail it to other Admins & Managers. Every run is saved to history.
 */
@Component({
  selector: 'app-analysis',
  imports: [FormsModule, DatePipe, DecimalPipe, Alert, AnalysisChartView, Paginator],
  templateUrl: './analysis.html',
  styles: [
    `
      .nn-edge { opacity: 0.15; animation: nn-pulse 2s ease-in-out infinite; }
      .nn-node { animation: nn-glow 1.6s ease-in-out infinite; }
      @keyframes nn-pulse { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.85; stroke: #c7d2fe; } }
      @keyframes nn-glow { 0%, 100% { fill: #1e1b4b; } 50% { fill: #6366f1; } }
      @media (prefers-reduced-motion: reduce) { .nn-edge, .nn-node { animation: none; } }
    `,
  ],
})
export class Analysis implements OnDestroy {
  private readonly service = inject(AnalysisService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly access = signal<AnalysisAccess | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly view = signal<View>('new');

  // ---- module picker ----
  readonly modules = signal<AnalysisModule[]>([]);
  readonly selected = signal<Set<string>>(new Set());
  readonly lookbackDays = signal(180);
  readonly horizonDays = signal(30);
  readonly title = signal('');
  readonly lookbackOptions = [
    { value: 90, label: 'Last 90 days' },
    { value: 180, label: 'Last 6 months' },
    { value: 365, label: 'Last 12 months' },
    { value: 730, label: 'Last 2 years' },
  ];
  readonly horizonOptions = [7, 14, 30, 60, 90];

  readonly agencyModules = computed(() => this.modules().filter((m) => m.category === 'Agency'));
  readonly productModules = computed(() => this.modules().filter((m) => m.category === 'Product'));
  readonly selectedCount = computed(() => this.selected().size);
  readonly allSelected = computed(() => this.modules().length > 0 && this.selected().size === this.modules().length);

  // ---- running ----
  readonly running = signal(false);
  readonly runStep = signal(0);
  private stepTimer?: ReturnType<typeof setInterval>;
  readonly runSteps = computed(() => {
    const titles = this.modules().filter((m) => this.selected().has(m.key)).map((m) => `Training ${m.title.toLowerCase()} network`);
    return ['Loading agency history', 'Engineering features', ...titles, 'Scoring predictions', 'Writing the report'];
  });

  // ---- report ----
  readonly result = signal<AnalysisResult | null>(null);
  readonly reportLoading = signal(false);
  readonly activeSection = signal<string | null>(null);
  readonly pdfBusy = signal(false);
  readonly fileBusy = signal(false);
  readonly notice = signal('');

  // ---- history ----
  readonly history = signal<AnalysisReportSummary[]>([]);
  readonly historyTotal = signal(0);
  readonly historyPage = signal(1);
  readonly historyPageSize = signal(10);
  readonly historyLoading = signal(false);

  // ---- share ----
  readonly shareOpen = signal(false);
  readonly recipients = signal<AnalysisRecipient[]>([]);
  readonly recipientFilter = signal('');
  readonly shareSelected = signal<Set<number>>(new Set());
  readonly shareMessage = signal('');
  readonly attachPdf = signal(true);
  readonly shareBusy = signal(false);
  readonly shareError = signal('');
  readonly shareNotice = signal('');

  readonly filteredRecipients = computed(() => {
    const q = this.recipientFilter().trim().toLowerCase();
    return this.recipients().filter(
      (r) => !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.roleName.toLowerCase().includes(q),
    );
  });

  // ---- decorative network for the loader ----
  readonly netNodes: NetNode[] = (() => {
    const layers = [4, 6, 6, 3, 1];
    const nodes: NetNode[] = [];
    layers.forEach((count, l) => {
      for (let i = 0; i < count; i++) {
        nodes.push({ layer: l, x: 30 + l * 85, y: 110 + (i - (count - 1) / 2) * 34 });
      }
    });
    return nodes;
  })();
  readonly netEdges = this.netNodes.flatMap((a, ai) =>
    this.netNodes.filter((b) => b.layer === a.layer + 1).map((b, bi) => ({ a, b, delay: ((ai * 7 + bi * 3) % 20) / 10 })),
  );

  constructor() {
    this.service.access().subscribe({
      next: (a) => {
        this.access.set(a);
        this.loading.set(false);
        if (!a.canView) return;

        this.service.modules().subscribe((m) => {
          this.modules.set(m);
          this.selected.set(new Set(m.map((x) => x.key)));
        });
        if (!a.canRun) this.view.set('history');
        this.loadHistory();

        const reportId = Number(this.route.snapshot.queryParamMap.get('report'));
        if (reportId) this.openReport(reportId);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load AI Analysis.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.stepTimer);
  }

  setView(v: View): void {
    this.view.set(v);
    if (v === 'history') this.loadHistory();
  }

  // ------------------------------------------------------------------ picker

  toggleModule(key: string): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.modules().map((m) => m.key)));
  }

  isSelected(key: string): boolean {
    return this.selected().has(key);
  }

  // ------------------------------------------------------------------ run

  run(): void {
    if (!this.selectedCount() || this.running()) return;
    this.running.set(true);
    this.error.set('');
    this.notice.set('');
    this.runStep.set(0);
    clearInterval(this.stepTimer);
    this.stepTimer = setInterval(() => {
      this.runStep.update((s) => Math.min(s + 1, this.runSteps().length - 1));
    }, 650);

    this.service
      .run({
        modules: [...this.selected()],
        lookbackDays: this.lookbackDays(),
        horizonDays: this.horizonDays(),
        title: this.title().trim() || null,
      })
      .subscribe({
        next: (r) => {
          clearInterval(this.stepTimer);
          this.running.set(false);
          this.showResult(r);
          this.notice.set(`Analysis saved as report #${r.reportId}.`);
        },
        error: (err: Error) => {
          clearInterval(this.stepTimer);
          this.running.set(false);
          this.error.set(err.message || 'The analysis could not be completed.');
        },
      });
  }

  private showResult(r: AnalysisResult): void {
    this.result.set(r);
    this.activeSection.set(r.sections[0]?.key ?? null);
    this.view.set('report');
    this.router.navigate([], { queryParams: { report: r.reportId }, replaceUrl: true });
  }

  openReport(reportId: number): void {
    this.reportLoading.set(true);
    this.error.set('');
    this.service.report(reportId).subscribe({
      next: (r) => {
        this.reportLoading.set(false);
        this.showResult(r);
      },
      error: (err: Error) => {
        this.reportLoading.set(false);
        this.error.set(err.message || 'Could not open the report.');
      },
    });
  }

  scrollTo(section: AnalysisSection): void {
    this.activeSection.set(section.key);
    document.getElementById(`sec-${section.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ------------------------------------------------------------------ history

  loadHistory(): void {
    this.historyLoading.set(true);
    this.service.reports(this.historyPage(), this.historyPageSize()).subscribe({
      next: (p) => {
        this.history.set(p.items);
        this.historyTotal.set(p.total);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  onHistoryPage(p: number): void {
    this.historyPage.set(p);
    this.loadHistory();
  }

  onHistorySize(size: number): void {
    this.historyPageSize.set(size);
    this.historyPage.set(1);
    this.loadHistory();
  }

  moduleTitle(key: string): string {
    return this.modules().find((m) => m.key === key)?.title ?? key;
  }

  // ------------------------------------------------------------------ files

  /** Builds the PDF in the browser from the server-rendered report file. */
  private async buildPdf(reportId: number): Promise<string> {
    const html = await new Promise<string>((resolve, reject) =>
      this.service.reportFile(reportId).subscribe({ next: resolve, error: reject }),
    );
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const css = Array.from(doc.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n');
    const el = document.createElement('div');
    el.style.width = '1000px';
    el.style.background = '#ffffff';
    el.innerHTML = `<style>${css}</style>${doc.body.innerHTML}`;

    const html2pdf = (await import('html2pdf.js')).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker: any = html2pdf().set(PDF_OPTS as any).from(el);
    return (await worker.outputPdf('datauristring')) as string;
  }

  async downloadPdf(): Promise<void> {
    const r = this.result();
    if (!r) return;
    this.pdfBusy.set(true);
    try {
      const uri = await this.buildPdf(r.reportId);
      downloadPdfDataUri(uri, `ai-analysis-${r.reportId}.pdf`);
    } catch {
      this.error.set('Could not create the PDF.');
    } finally {
      this.pdfBusy.set(false);
    }
  }

  downloadFile(): void {
    const r = this.result();
    if (!r) return;
    this.fileBusy.set(true);
    this.service.reportFile(r.reportId).subscribe({
      next: (html) => {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-analysis-${r.reportId}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.fileBusy.set(false);
      },
      error: () => {
        this.fileBusy.set(false);
        this.error.set('Could not download the report file.');
      },
    });
  }

  // ------------------------------------------------------------------ share

  openShare(): void {
    this.shareOpen.set(true);
    this.shareError.set('');
    this.shareNotice.set('');
    if (!this.recipients().length) {
      this.service.recipients().subscribe({
        next: (r) => this.recipients.set(r),
        error: (err: Error) => this.shareError.set(err.message || 'Could not load recipients.'),
      });
    }
  }

  closeShare(): void {
    if (!this.shareBusy()) this.shareOpen.set(false);
  }

  toggleRecipient(id: number): void {
    this.shareSelected.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectRole(role: string): void {
    const ids = this.recipients().filter((r) => r.roleName === role).map((r) => r.userId);
    this.shareSelected.update((s) => new Set([...s, ...ids]));
  }

  async send(): Promise<void> {
    const r = this.result();
    if (!r || !this.shareSelected().size) return;
    this.shareBusy.set(true);
    this.shareError.set('');
    this.shareNotice.set('');
    let pdf: string | null = null;
    if (this.attachPdf()) {
      try {
        pdf = await this.buildPdf(r.reportId);
      } catch {
        pdf = null; // fall back to the HTML report file
      }
    }
    this.service
      .share(r.reportId, { userIds: [...this.shareSelected()], message: this.shareMessage().trim() || null, pdfBase64: pdf })
      .subscribe({
        next: ({ result, message }) => {
          this.shareBusy.set(false);
          if (result.failed) this.shareError.set(`Could not deliver to: ${result.failedRecipients.join(', ')}`);
          this.shareNotice.set(message);
          this.result.update((x) => (x ? { ...x, shareCount: x.shareCount + result.sent } : x));
          if (!result.failed) {
            this.shareSelected.set(new Set());
            this.shareMessage.set('');
          }
        },
        error: (err: Error) => {
          this.shareBusy.set(false);
          this.shareError.set(err.message || 'Could not send the report.');
        },
      });
  }

  // ------------------------------------------------------------------ view helpers

  scoreColor(score: number): string {
    return score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
  }

  /** stroke-dasharray for the circular health gauge (r = 52). */
  gauge(score: number): string {
    const c = 2 * Math.PI * 52;
    return `${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`;
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Healthy':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      case 'Watch':
        return 'bg-amber-50 text-amber-700 ring-amber-200';
      default:
        return 'bg-rose-50 text-rose-700 ring-rose-200';
    }
  }

  toneText(tone: KpiTone): string {
    switch (tone) {
      case 'good':
        return 'text-emerald-600';
      case 'warn':
        return 'text-amber-600';
      case 'bad':
        return 'text-rose-600';
      default:
        return 'text-slate-900';
    }
  }

  insightClass(i: AnalysisInsight): string {
    switch (i.severity) {
      case 'critical':
        return 'border-rose-200 bg-rose-50 text-rose-800';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'positive':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      default:
        return 'border-brand-100 bg-brand-50 text-brand-800';
    }
  }

  insightIcon(i: AnalysisInsight): string {
    switch (i.severity) {
      case 'critical':
        return 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z';
      case 'warning':
        return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'positive':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  clearShareSelection(): void {
    this.shareSelected.set(new Set());
  }

  /** Colour pill for "NN%" risk cells. */
  riskClass(cell: string): string {
    const v = parseFloat(cell);
    return v >= 50 ? 'bg-rose-50 text-rose-700' : v >= 25 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
  }

  /** A lone leading line chart spans both columns so the grid stays balanced. */
  chartCellClass(type: string, count: number, index: number): string {
    const wide = type === 'line' && count % 2 === 1 && index === 0;
    return 'rounded-2xl border border-slate-100 p-4' + (wide ? ' lg:col-span-2' : '');
  }

  initials(name: string): string {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('') || '?'
    );
  }
}
