/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleName } from '../models/role.model';
import { AuthService } from '../services/auth.service';

/**
 * Restricts a route to the roles listed in `route.data.roles`.
 * Usage: `{ path: 'users', canActivate: [roleGuard], data: { roles: ['SuperAdmin', 'Admin'] } }`
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed = (route.data['roles'] as RoleName[] | undefined) ?? [];
  const current = auth.roleName();

  if (current && allowed.includes(current)) {
    return true;
  }
  // Authenticated but wrong role → send to their own dashboard home.
  return router.createUrlTree(['/dashboard']);
};
