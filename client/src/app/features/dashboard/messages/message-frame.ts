/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * A complete HTML document for a `sandbox=""` iframe `srcdoc` (preview / sent message body).
 * The HTML is already sanitized by the server; the empty sandbox additionally blocks scripts,
 * forms, pop-ups and same-origin access. A full document from the server is used as-is.
 */
export function emailDocument(html: string): string {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;word-wrap:break-word}
img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:4px 8px}
a{color:#4f46e5}h1{font-size:1.6em}h2{font-size:1.3em}h3{font-size:1.1em}p{margin:0 0 .5em}
</style></head><body>${html}</body></html>`;
}
