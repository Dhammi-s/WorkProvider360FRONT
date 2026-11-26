/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { MonitoringAuthService } from './monitoring-auth.service';

/** Auth endpoints that authenticate by other means (credentials / cookie): no bearer, no retry. */
const BYPASS_SUFFIXES = ['/auth/login', '/auth/refresh', '/auth/reset-password', '/auth/logout'];

function isBypassed(url: string): boolean {
  const path = url.split('?')[0];
  return BYPASS_SUFFIXES.some((s) => path.endsWith(s));
}

/**
 * Attaches the in-memory monitoring bearer token ONLY to `/monitoring/` URLs. On a 401 it
 * performs one single-flight refresh (cookie) and retries the request once; if that fails
 * the monitoring session is cleared and the user is sent to /monitoring/login.
 */
export const monitoringAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/monitoring/')) return next(req);

  const auth = inject(MonitoringAuthService);
  const router = inject(Router);

  const withToken = (r: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = auth.accessToken;
    return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  if (isBypassed(req.url)) return next(req);

  const toLogin = () => {
    auth.clearSession();
    const returnUrl = router.url.startsWith('/monitoring') && !router.url.startsWith('/monitoring/login')
      ? router.url
      : undefined;
    router.navigate(['/monitoring/login'], returnUrl ? { queryParams: { returnUrl } } : {});
  };

  return next(withToken(req)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          // Refresh itself failed: the monitoring session is gone.
          toLogin();
          return throwError(() => refreshError);
        }),
        switchMap(() =>
          next(withToken(req)).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) toLogin();
              return throwError(() => retryError);
            }),
          ),
        ),
      );
    }),
  );
};
