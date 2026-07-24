import { SecurityStats } from '../../core/models/security.model';

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TYPE_LABELS: Record<string, string> = {
  LoginSuccess: 'Successful login',
  LoginFailed: 'Failed login',
  Unauthorized: 'Unauthorized access',
  SqlInjection: 'SQL injection attempt',
  DosAttempt: 'DoS / rate abuse',
};

function label(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/**
 * Renders the security report to an off-screen HTML template and exports it to
 * PDF client-side via html2pdf.js (MIT — no license required).
 */
export async function exportSecurityPdf(stats: SecurityStats): Promise<void> {
  const generated = new Date().toLocaleString();

  const summaryRows = [
    ['Total events', stats.totalEvents],
    ['Successful logins', stats.totalLogins],
    ['Failed logins', stats.failedLogins],
    ['Unauthorized access', stats.unauthorized],
    ['SQL injection attempts', stats.sqlInjectionAttempts],
    ['DoS / rate-abuse events', stats.dosAttempts],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#64748b;width:220px">${k}</td><td style="font-weight:700">${v}</td></tr>`,
    )
    .join('');

  const loginRows = stats.loginStats.length
    ? stats.loginStats
        .map(
          (l) => `
            <tr>
              <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${esc(l.email)}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eef2f7;color:#059669;font-weight:600">${l.successCount}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eef2f7;color:#dc2626;font-weight:600">${l.failedCount}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" style="padding:8px;color:#94a3b8">No login activity recorded.</td></tr>';

  const eventRows = stats.recent.length
    ? stats.recent
        .map(
          (e) => `
            <tr>
              <td style="padding:5px 8px;border-bottom:1px solid #eef2f7">${esc(new Date(e.createdOn).toLocaleString())}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #eef2f7">${esc(label(e.eventType))}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #eef2f7">${esc(e.email) || '—'}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #eef2f7">${esc(e.ipAddress) || '—'}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #eef2f7">${esc(e.path) || '—'}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="padding:8px;color:#94a3b8">No events recorded.</td></tr>';

  const el = document.createElement('div');
  el.style.width = '760px';
  el.style.padding = '32px';
  el.style.fontFamily = 'Inter, Arial, sans-serif';
  el.style.color = '#0f172a';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:36px;height:36px;border-radius:8px;background:#4f46e5;color:#fff;
                  display:flex;align-items:center;justify-content:center;font-weight:800">W</div>
      <div>
        <div style="font-size:18px;font-weight:800">WorkProvider360 — Security Report</div>
        <div style="font-size:12px;color:#64748b">Generated ${esc(generated)}</div>
      </div>
    </div>

    <div style="font-size:14px;font-weight:700;margin:8px 0 8px">Summary</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px"><tbody>${summaryRows}</tbody></table>

    <div style="font-size:14px;font-weight:700;margin:8px 0 8px;border-top:1px solid #e2e8f0;padding-top:16px">Logins by account</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px">
      <thead><tr style="text-align:left;color:#64748b">
        <th style="padding:6px 8px">Account</th><th style="padding:6px 8px">Successful</th><th style="padding:6px 8px">Failed</th>
      </tr></thead>
      <tbody>${loginRows}</tbody>
    </table>

    <div style="font-size:14px;font-weight:700;margin:8px 0 8px;border-top:1px solid #e2e8f0;padding-top:16px">Recent events</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr style="text-align:left;color:#64748b">
        <th style="padding:5px 8px">Time</th><th style="padding:5px 8px">Type</th>
        <th style="padding:5px 8px">Account</th><th style="padding:5px 8px">IP</th><th style="padding:5px 8px">Path</th>
      </tr></thead>
      <tbody>${eventRows}</tbody>
    </table>
  `;

  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf()
    .set({
      margin: 10,
      filename: `security-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(el)
    .save();
}
