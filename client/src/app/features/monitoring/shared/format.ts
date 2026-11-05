/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Display helpers shared by the monitoring pages. */

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '–';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 10_000) return (n / 1_000).toFixed(1) + 'k';
  return Math.round(n).toLocaleString();
}

export function fmtMs(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '–';
  if (n >= 1000) return (n / 1000).toFixed(2) + ' s';
  return (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10) + ' ms';
}

/** `value` is a fraction (0-1) or already a percentage when > 1. */
export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '–';
  const pct = value <= 1 ? value * 100 : value;
  return pct.toFixed(pct < 10 ? 2 : 1) + '%';
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Axis label for a time bucket; shows the date when the range spans more than a day. */
export function fmtBucket(iso: string, bucketSeconds: number, spanMs: number): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (bucketSeconds >= 86_400) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (spanMs > 24 * 3_600_000) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + time;
  }
  return time;
}

export function shortEndpoint(endpoint: string, max = 38): string {
  return endpoint.length > max ? '…' + endpoint.slice(endpoint.length - max + 1) : endpoint;
}

export function statusClass(code: number): string {
  if (code >= 500) return 'bg-red-50 text-red-700 ring-red-200';
  if (code >= 400) return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (code >= 300) return 'bg-sky-50 text-sky-700 ring-sky-200';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

export function methodClass(method: string): string {
  switch (method?.toUpperCase()) {
    case 'GET': return 'bg-sky-50 text-sky-700';
    case 'POST': return 'bg-emerald-50 text-emerald-700';
    case 'PUT': return 'bg-amber-50 text-amber-700';
    case 'DELETE': return 'bg-red-50 text-red-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}
