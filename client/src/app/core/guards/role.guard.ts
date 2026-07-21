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
