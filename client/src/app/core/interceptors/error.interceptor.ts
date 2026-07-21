import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

/** Endpoints that must never trigger the silent-refresh retry. */
const AUTH_BYPASS = ['/auth/login', '/auth/refresh-token', '/auth/forgot-password', '/auth/reset-password', '/users/bootstrap-admin'];

/**
 * Normalises API errors into a readable message and handles expired tokens:
 * on a 401 it attempts a single silent refresh and retries the original
 * request; if that fails it clears the session and redirects to /login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const storage = inject(TokenStorageService);
  const router = inject(Router);

  const isBypassed = AUTH_BYPASS.some((path) => req.url.includes(path));

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isBypassed && storage.refreshToken) {
        return auth.refreshToken().pipe(
          switchMap((refreshed) =>
            next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${refreshed.accessToken}` },
              }),
            ),
          ),
          catchError((refreshError) => {
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => normalise(refreshError));
          }),
        );
      }

      if (error.status === 401 && !isBypassed) {
        auth.clearSession();
        router.navigate(['/login']);
      }

      return throwError(() => normalise(error));
    }),
  );
};

/** Pull the friendliest message out of the API envelope or HTTP error. */
function normalise(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (body && typeof body === 'object') {
      const message = (body as { message?: string }).message;
      const errors = (body as { errors?: string[] }).errors;
      if (errors?.length) {
        return new Error(errors.join(' '));
      }
      if (message) {
        return new Error(message);
      }
    }
    if (error.status === 0) {
      return new Error('Cannot reach the server. Check your connection and try again.');
    }
    return new Error(error.message || 'An unexpected error occurred.');
  }
  return error instanceof Error ? error : new Error('An unexpected error occurred.');
}
