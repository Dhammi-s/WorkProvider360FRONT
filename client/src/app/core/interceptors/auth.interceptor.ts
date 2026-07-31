/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Attaches the Bearer access token (when present) and the `X-Tenant-Domain`
 * header so the backend can resolve the tenant on anonymous requests.
 * Only touches requests aimed at our own API.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest =
    req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('http') === false;
  if (!isApiRequest) {
    return next(req);
  }

  const storage = inject(TokenStorageService);
  const headers: Record<string, string> = {};

  const token = storage.accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (environment.tenantDomain) {
    headers['X-Tenant-Domain'] = environment.tenantDomain;
  }

  return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req);
};
