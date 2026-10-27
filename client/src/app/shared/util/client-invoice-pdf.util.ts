/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ClientInvoiceDetail } from '../../core/models/client-invoice.model';

function esc(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export interface ClientInvoicePdfOptions {
  /** Mark lines that were not approved (staff copy). Off for the client portal. */
  showApproval?: boolean;
}

/** Builds the off-screen client invoice (same look as the payroll invoice). */
function buildElement({ invoice: i, lines }: ClientInvoiceDetail, opts: ClientInvoicePdfOptions): HTMLElement {
  const showApproval = opts.showApproval ?? true;
  const stamp =
    i.status === 'Paid'
      ? { text: 'PAID', color: '#059669' }
      : i.status === 'Void'
        ? { text: 'VOID', color: '#dc2626' }
        : { text: 'DUE', color: '#4f46e5' };

  const rows = lines
    .map(
      (l) => `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 0">
          <div style="font-weight:600">${esc(l.description)}</div>
          <div style="color:#64748b;font-size:11px">${esc(fmtDate(l.serviceStartUtc))} · ${esc(fmtTime(l.serviceStartUtc))}–${esc(fmtTime(l.serviceEndUtc))}${l.caregiverName ? ' · ' + esc(l.caregiverName) : ''}${showApproval && !l.isApproved ? ' · <span style="color:#b45309">not approved</span>' : ''}</div>
        </td>
        <td style="padding:8px 0;text-align:right">${l.hours.toFixed(2)}</td>
        <td style="padding:8px 0;text-align:right">${money(l.billRatePerHour)}</td>
        <td style="padding:8px 0;text-align:right;font-weight:600">${money(l.amount)}</td>
      </tr>`,
    )
    .join('');

  const el = document.createElement('div');
  el.style.width = '760px';
  el.style.padding = '40px';
  el.style.fontFamily = 'Inter, Arial, sans-serif';
  el.style.color = '#0f172a';
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e1b4b;padding-bottom:20px">
      <div>
        <div style="font-size:22px;font-weight:800;color:#1e1b4b">WorkProvider<span style="color:#059669">360</span></div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">Client invoice</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#334155">INVOICE</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">#${esc(i.invoiceNumber)}</div>
        <div style="color:#64748b;font-size:12px">${esc(fmtDate(i.createdOn))}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:24px">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">Billed to</div>
        <div style="font-weight:700;margin-top:6px;font-size:15px">${esc(i.billToName)}</div>
        ${i.billToEmail ? `<div style="color:#475569;font-size:13px">${esc(i.billToEmail)}</div>` : ''}
        <div style="color:#475569;font-size:13px;margin-top:6px">Client: ${esc(i.clientName)}</div>
        <div style="color:#475569;font-size:13px">Service period: ${esc(fmtDate(i.periodFromUtc))} – ${esc(fmtDate(i.periodToUtc))}</div>
      </div>
      <div style="position:relative;width:180px;height:70px">
        <div style="position:absolute;right:0;top:8px;transform:rotate(-8deg);border:3px solid ${stamp.color};color:${stamp.color};
                    padding:6px 14px;border-radius:8px;font-weight:800;font-size:16px;letter-spacing:1px;opacity:.9">
          ${stamp.text}
        </div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:13px">
      <thead>
        <tr style="border-bottom:1px solid #e2e8f0;color:#94a3b8;font-size:11px;text-transform:uppercase">
          <th style="text-align:left;padding:8px 0">Service</th>
          <th style="text-align:right;padding:8px 0">Hours</th>
          <th style="text-align:right;padding:8px 0">Rate</th>
          <th style="text-align:right;padding:8px 0">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:20px">
      <table style="font-size:14px;min-width:260px">
        <tr><td style="padding:6px 0;color:#64748b">Total hours</td><td style="text-align:right;font-weight:600">${i.totalHours.toFixed(2)}</td></tr>
        <tr><td style="padding:12px 0;font-size:18px;font-weight:800;border-top:2px solid #1e1b4b">${i.status === 'Paid' ? 'Total paid' : 'Total due'}</td>
            <td style="padding:12px 0;font-size:18px;font-weight:800;text-align:right;border-top:2px solid #1e1b4b;color:${stamp.color}">${money(i.amount)}</td></tr>
      </table>
    </div>

    ${i.notes ? `<div style="margin-top:20px;font-size:12px;color:#475569"><strong>Notes:</strong> ${esc(i.notes)}</div>` : ''}

    <div style="margin-top:40px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:14px">
      This invoice was issued by WorkProvider360. Thank you.
    </div>
  `;
  return el;
}

const PDF_OPTS = {
  margin: 10,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
};

/** Renders the client invoice to PDF in the browser and downloads it. */
export async function downloadClientInvoicePdf(detail: ClientInvoiceDetail, opts: ClientInvoicePdfOptions = {}): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worker: any = html2pdf().set({ ...PDF_OPTS, filename: `invoice-${detail.invoice.invoiceNumber}.pdf` } as any).from(buildElement(detail, opts));
  await worker.save();
}
