/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpResponse } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';

/** Small helpers shared by the billing services. */

/** The envelope's data; throws when the call failed or returned nothing. */
export function unwrapData<T>(res: ApiResponse<T>): T {
  if (!res.success || res.data == null) {
    throw new Error(res.message ?? 'Request failed.');
  }
  return res.data;
}

/** The envelope's data (may be null, e.g. DELETE / retry endpoints); throws only on failure. */
export function unwrapOptional<T>(res: ApiResponse<T>): T | null {
  if (!res.success) throw new Error(res.message ?? 'Request failed.');
  return res.data ?? null;
}

/** Query params from an object: null / undefined / '' / false-y "only" flags are left out. */
export function queryParams(values: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === undefined || v === '') continue;
    params[k] = String(v);
  }
  return params;
}

/** Saves a file response (blob) using the server's file name when it sends one. */
export function saveFileResponse(res: HttpResponse<Blob>, fallbackName: string): void {
  const cd = res.headers.get('content-disposition') ?? '';
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(res.body as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = decodeURIComponent(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a PDF blob in a new tab (falls back to a download when pop-ups are blocked). */
export function openPdfResponse(res: HttpResponse<Blob>, fallbackName: string): void {
  const blob = res.body as Blob;
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    saveFileResponse(res, fallbackName);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
