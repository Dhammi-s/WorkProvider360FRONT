/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ApplicationDetail } from '../../core/models/application.model';

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders an application to a styled, off-screen HTML template and exports it to
 * PDF entirely client-side via html2pdf.js (MIT — no license required).
 */
export async function exportApplicationPdf(app: ApplicationDetail): Promise<void> {
  const created = new Date(app.createdOn).toLocaleString();
  const answersHtml = app.answers.length
    ? app.answers
        .map(
          (a) => `
            <div style="margin-bottom:12px">
              <div style="font-weight:600;color:#334155">${esc(a.questionText)}</div>
              <div style="color:#475569">${esc(a.answerText) || '<em style="color:#94a3b8">No answer</em>'}</div>
            </div>`,
        )
        .join('')
    : '<div style="color:#94a3b8">No custom questions.</div>';

  const el = document.createElement('div');
  el.style.width = '720px';
  el.style.padding = '32px';
  el.style.fontFamily = 'Inter, Arial, sans-serif';
  el.style.color = '#0f172a';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
      <div style="width:36px;height:36px;border-radius:8px;background:#4f46e5;color:#fff;
                  display:flex;align-items:center;justify-content:center;font-weight:800">W</div>
      <div style="font-size:18px;font-weight:800">WorkProvider360 — Role Application</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
      <tbody>
        <tr><td style="padding:6px 0;color:#64748b;width:160px">Application ID</td><td style="font-weight:600">#${app.applicationId}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Full name</td><td style="font-weight:600">${esc(app.fullName)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Email</td><td>${esc(app.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Phone</td><td>${esc(app.phone) || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Address</td><td>${esc(app.address) || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Requested role</td><td style="font-weight:600">${esc(app.requestedRoleName)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Status</td><td style="font-weight:600">${esc(app.status)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Submitted</td><td>${esc(created)}</td></tr>
      </tbody>
    </table>
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;border-top:1px solid #e2e8f0;padding-top:16px">
      Screening answers
    </div>
    <div style="font-size:13px">${answersHtml}</div>
  `;

  // Lazy-load the (heavy) PDF library only when an export is actually requested.
  const html2pdf = (await import('html2pdf.js')).default;

  await html2pdf()
    .set({
      margin: 10,
      filename: `application-${app.applicationId}-${app.fullName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(el)
    .save();
}
