/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Uniform response envelope returned by every WorkProvider360 API endpoint.
 * Mirrors the backend `ApiResponse<T>` DTO.
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
}

/**
 * The Error thrown by the error interceptor: `message` is the friendliest text; the raw
 * envelope parts are kept so a screen can show the server message and its errors[].
 */
export interface ApiError extends Error {
  status?: number;
  apiMessage?: string | null;
  apiErrors?: string[];
}

/** Server message + errors[] lines of a failed call (falls back to the error message). */
export function apiErrorLines(err: unknown, fallback = 'Request failed.'): { message: string; errors: string[] } {
  const e = err as ApiError | null;
  const errors = e?.apiErrors ?? [];
  const message = e?.apiMessage || (errors.length ? '' : e?.message || fallback);
  return { message, errors };
}
