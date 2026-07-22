import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScheduleReport, ScheduleReportRow } from '../../../core/models/scheduler.model';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { Alert } from '../../../shared/ui/alert/alert';

function iso(d: Date): string {
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Hours + earnings report per user over a date range. */
@Component({
  selector: 'app-reports',
  imports: [FormsModule, DecimalPipe, Alert],
  templateUrl: './reports.html',
})
export class Reports {
  private readonly service = inject(SchedulerService);

  readonly from = signal('');
  readonly to = signal('');
  readonly userFilter = signal<number | null>(null);

  readonly report = signal<ScheduleReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pdfBusy = signal(false);

  constructor() {
    const now = new Date();
    this.from.set(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
    this.to.set(iso(now));
    this.run();
  }

  run(): void {
    this.loading.set(true);
    this.error.set('');
    const fromParam = `${this.from()}T00:00:00`;
    const toParam = `${this.to()}T23:59:59`;
    this.service.report(fromParam, toParam).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the report.');
        this.report.set(null);
        this.loading.set(false);
      },
    });
  }

  readonly rows = computed<ScheduleReportRow[]>(() => {
    const r = this.report();
    if (!r) return [];
    const uid = this.userFilter();
    return uid == null ? r.rows : r.rows.filter((x) => x.userId === uid);
  });

  readonly totals = computed(() => {
    const rows = this.rows();
    const sum = (sel: (x: ScheduleReportRow) => number) =>
      Math.round(rows.reduce((acc, x) => acc + sel(x), 0) * 100) / 100;
    return {
      regularHours: sum((x) => x.regularHours),
      overtimeHours: sum((x) => x.overtimeHours),
      totalHours: sum((x) => x.totalHours),
      totalPay: sum((x) => x.totalPay),
    };
  });

  async exportPdf(): Promise<void> {
    const r = this.report();
    if (!r) return;
    this.pdfBusy.set(true);
    try {
      const rows = this.rows();
      const money = (n: number) => n.toFixed(2);
      const body = rows
        .map(
          (x) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${x.userName}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${x.scheduleCount}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${x.regularHours}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${x.overtimeHours}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${x.totalHours}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${money(x.totalPay)}</td>
          </tr>`,
        )
        .join('');
      const t = this.totals();
      const el = document.createElement('div');
      el.style.width = '760px';
      el.style.padding = '32px';
      el.style.fontFamily = 'Inter, Arial, sans-serif';
      el.style.color = '#0f172a';
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="width:34px;height:34px;border-radius:8px;background:#4f46e5;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">W</div>
          <div style="font-size:18px;font-weight:800">WorkProvider360 — Scheduling Report</div>
        </div>
        <div style="color:#64748b;font-size:13px;margin-bottom:18px">${this.from()} to ${this.to()}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="text-align:left;color:#64748b">
              <th style="padding:6px 8px;border-bottom:2px solid #cbd5e1">User</th>
              <th style="padding:6px 8px;border-bottom:2px solid #cbd5e1;text-align:right">Jobs</th>
              <th style="padding:6px 8px;border-bottom:2px solid #cbd5e1;text-align:right">Regular h</th>
              <th style="padding:6px 8px;border-bottom:2px solid #cbd5e1;text-align:right">OT h</th>
              <th style="padding:6px 8px;border-bottom:2px solid #cbd5e1;text-align:right">Total h</th>
              <th style="padding:6px 8px;border-bottom:2px solid #cbd5e1;text-align:right">Pay</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
          <tfoot>
            <tr style="font-weight:700">
              <td style="padding:8px">Totals</td><td></td>
              <td style="padding:8px;text-align:right">${t.regularHours}</td>
              <td style="padding:8px;text-align:right">${t.overtimeHours}</td>
              <td style="padding:8px;text-align:right">${t.totalHours}</td>
              <td style="padding:8px;text-align:right">${money(t.totalPay)}</td>
            </tr>
          </tfoot>
        </table>`;
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: `scheduling-report-${this.from()}_${this.to()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        })
        .from(el)
        .save();
    } finally {
      this.pdfBusy.set(false);
    }
  }
}
