/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TrainingSessionService } from '../services/training-session.service';

/**
 * Guards the training portal. Uses the training session only (never the main
 * session): without a valid training token the visitor goes to /training-login.
 */
export const trainingAuthGuard: CanActivateFn = (_route, state) => {
  const session = inject(TrainingSessionService);
  const router = inject(Router);

  if (session.accessToken && session.user()) {
    return true;
  }
  session.clear();
  return router.createUrlTree(['/training-login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Training-portal pages limited to some roles (route data.roles); others go to /training. */
export const trainingRoleGuard: CanActivateFn = (route) => {
  const session = inject(TrainingSessionService);
  const router = inject(Router);
  const roles = (route.data['roles'] as string[] | undefined) ?? [];
  const role = session.user()?.roleName;
  return !roles.length || (role && roles.includes(role)) ? true : router.createUrlTree(['/training']);
};
