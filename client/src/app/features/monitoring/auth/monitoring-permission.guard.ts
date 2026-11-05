/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MonitoringAuthService } from './monitoring-auth.service';

/** Route guard: `data: { permission: 'logs.view' }` must be held by the monitoring user. */
export const monitoringPermissionGuard: CanActivateFn = (route) => {
  const auth = inject(MonitoringAuthService);
  const router = inject(Router);
  const required = route.data?.['permission'] as string | undefined;
  if (!required || auth.hasPermission(required)) return true;
  return router.createUrlTree(['/monitoring/no-access']);
};
