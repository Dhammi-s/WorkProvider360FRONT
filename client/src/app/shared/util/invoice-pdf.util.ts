/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export interface InvoicePdfModel {
  invoiceNumber: string;
  dateStr: string;
  recipientName: string;
  recipientEmail: string;
  recipientRoleName?: string | null;
  invoiceType: 'Salary' | 'ShiftPay';
  amount: number;
  regularHours?: number | null;
  overtimeHours?: number | null;
  totalHours?: number | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  paymentMethod: 'Cash' | 'Online';
}

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

/** Builds the off-screen invoice element (US-style) with a PAID stamp. */
function buildElement(m: InvoicePdfModel): HTMLElement {
  const isShift = m.invoiceType === 'ShiftPay';
  const stampColor = m.paymentMethod === 'Online' ? '#4f46e5' : '#059669';
  const stampText = `PAID · ${m.paymentMethod.toUpperCase()}`;

  const lineItems = isShift
    ? `
      <tr><td style="padding:8px 0">Regular hours</td><td style="text-align:right">${(m.regularHours ?? 0).toFixed(2)}</td></tr>
      <tr><td style="padding:8px 0">Overtime hours</td><td style="text-align:right">${(m.overtimeHours ?? 0).toFixed(2)}</td></tr>
      <tr><td style="padding:8px 0">Total hours</td><td style="text-align:right">${(m.totalHours ?? 0).toFixed(2)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Pay period</td><td style="text-align:right">${esc(fmtDate(m.periodFrom))} – ${esc(fmtDate(m.periodTo))}</td></tr>`
    : `<tr><td style="padding:8px 0">Salary payment${m.recipientRoleName ? ' (' + esc(m.recipientRoleName) + ')' : ''}</td><td style="text-align:right">${money(m.amount)}</td></tr>`;

  const el = document.createElement('div');
  el.style.width = '760px';
  el.style.padding = '40px';
  el.style.fontFamily = 'Inter, Arial, sans-serif';
  el.style.color = '#0f172a';
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e1b4b;padding-bottom:20px">
      <div>
        <div style="font-size:22px;font-weight:800;color:#1e1b4b">WorkProvider<span style="color:#059669">360</span></div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">Payroll &amp; Invoicing</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#334155">INVOICE</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px">#${esc(m.invoiceNumber)}</div>
        <div style="color:#64748b;font-size:12px">${esc(m.dateStr)}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:24px">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">Billed to</div>
        <div style="font-weight:700;margin-top:6px;font-size:15px">${esc(m.recipientName)}</div>
        <div style="color:#475569;font-size:13px">${esc(m.recipientEmail)}</div>
        ${m.recipientRoleName ? `<div style="color:#475569;font-size:13px">${esc(m.recipientRoleName)}</div>` : ''}
      </div>
      <div style="position:relative;width:180px;height:70px">
        <div style="position:absolute;right:0;top:8px;transform:rotate(-8deg);border:3px solid ${stampColor};color:${stampColor};
                    padding:6px 14px;border-radius:8px;font-weight:800;font-size:16px;letter-spacing:1px;opacity:.9">
          ${esc(stampText)}
        </div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:14px">
      <thead>
        <tr style="border-bottom:1px solid #e2e8f0;color:#94a3b8;font-size:12px;text-transform:uppercase">
          <th style="text-align:left;padding:8px 0">Description</th>
          <th style="text-align:right;padding:8px 0">Detail</th>
        </tr>
      </thead>
      <tbody style="border-bottom:1px solid #e2e8f0">${lineItems}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:20px">
      <table style="font-size:14px;min-width:260px">
        <tr><td style="padding:6px 0;color:#64748b">Payment method</td><td style="text-align:right;font-weight:600">${esc(m.paymentMethod)}</td></tr>
        <tr><td style="padding:12px 0;font-size:18px;font-weight:800;border-top:2px solid #1e1b4b">Total paid</td>
            <td style="padding:12px 0;font-size:18px;font-weight:800;text-align:right;border-top:2px solid #1e1b4b;color:${stampColor}">${money(m.amount)}</td></tr>
      </table>
    </div>

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

/** Generates the invoice PDF in the browser and returns a base64 data URI. */
export async function generateInvoicePdfBase64(model: InvoicePdfModel): Promise<string> {
  const html2pdf = (await import('html2pdf.js')).default;
  const el = buildElement(model);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worker: any = html2pdf().set(PDF_OPTS as any).from(el);
  const dataUri = (await worker.outputPdf('datauristring')) as string;
  return dataUri;
}

/** Triggers a browser download of a base64 PDF data URI. */
export function downloadPdfDataUri(dataUri: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
