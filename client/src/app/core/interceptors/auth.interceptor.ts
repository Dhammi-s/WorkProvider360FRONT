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
import { TrainingSessionService } from '../services/training-session.service';

/**
 * Attaches the Bearer access token (when present) and the `X-Tenant-Domain`
 * header so the backend can resolve the tenant on anonymous requests.
 * The tenant is the domain the app is opened on (each agency has its own),
 * unless `environment.tenantDomain` pins one (local dev behind the proxy).
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

  // The training portal API only accepts the training token; everything else
  // (including /training-auth/sso) uses the main-app token.
  const token = req.url.includes('/training-portal/') || req.url.endsWith('/training-portal')
    ? inject(TrainingSessionService).accessToken
    : req.url.includes('/training-auth/login')
      ? null
      : storage.accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const tenantDomain = environment.tenantDomain || window.location.hostname;
  if (tenantDomain) {
    headers['X-Tenant-Domain'] = tenantDomain;
  }

  return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req);
};
