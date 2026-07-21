import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // Public auth screens
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    title: 'Sign in · WorkProvider360',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    title: 'Create workspace · WorkProvider360',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    title: 'Forgot password · WorkProvider360',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
    title: 'Reset password · WorkProvider360',
  },

  // Authenticated app shell
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-layout/dashboard-layout').then(
        (m) => m.DashboardLayout,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/dashboard/home/home').then((m) => m.DashboardHome),
        title: 'Dashboard · WorkProvider360',
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] },
        loadComponent: () => import('./features/dashboard/users/users').then((m) => m.Users),
        title: 'Team · WorkProvider360',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/profile/profile').then((m) => m.Profile),
        title: 'Profile · WorkProvider360',
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
