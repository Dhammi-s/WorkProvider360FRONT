/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { MonitoringAuthService } from './monitoring-auth.service';

/**
 * Requires a monitoring session (restoring it from the refresh cookie after a reload) and,
 * unless the route opts in with `data: { allowMustChange: true }`, sends users who must
 * change their password to the change-password screen first.
 */
export const monitoringAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(MonitoringAuthService);
  const router = inject(Router);

  const decide = (ok: boolean) => {
    if (!ok) {
      return router.createUrlTree(['/monitoring/login'], { queryParams: { returnUrl: state.url } });
    }
    if (auth.mustChangePassword() && !route.data?.['allowMustChange']) {
      return router.createUrlTree(['/monitoring/change-password']);
    }
    return true;
  };

  if (auth.isAuthenticated()) return decide(true);
  return auth.restore().pipe(map(decide));
};

/** Sends `/monitoring` to the first page the signed-in user is allowed to open. */
export const monitoringHomeGuard: CanActivateFn = () => {
  const auth = inject(MonitoringAuthService);
  const router = inject(Router);
  const path = auth.firstAllowedPath();
  return router.createUrlTree(path ? ['/monitoring', path] : ['/monitoring/no-access']);
};
