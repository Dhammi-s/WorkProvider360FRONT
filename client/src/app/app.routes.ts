/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

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
  {
    path: 'apply',
    loadComponent: () => import('./features/apply/apply').then((m) => m.Apply),
    title: 'Apply for access · WorkProvider360',
  },
  // Public info pages (also reachable from the login screen)
  {
    path: 'help',
    loadComponent: () => import('./features/dashboard/help/help').then((m) => m.Help),
    title: 'Help Center · WorkProvider360',
  },
  {
    path: 'about',
    loadComponent: () => import('./features/dashboard/about/about').then((m) => m.About),
    title: 'About · WorkProvider360',
  },
  {
    path: 'setup',
    loadComponent: () => import('./features/auth/setup/setup').then((m) => m.Setup),
    title: 'Workspace setup · WorkProvider360',
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
        data: { roles: ['SuperAdmin', 'Admin', 'Manager'] },
        loadComponent: () => import('./features/dashboard/users/users').then((m) => m.Users),
        title: 'Team · WorkProvider360',
      },
      {
        path: 'applications',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] },
        loadComponent: () =>
          import('./features/dashboard/applications/applications').then((m) => m.Applications),
        title: 'Applications · WorkProvider360',
      },
      {
        path: 'offices',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] },
        loadComponent: () => import('./features/dashboard/offices/offices').then((m) => m.Offices),
        title: 'Offices · WorkProvider360',
      },
      {
        path: 'logs',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Manager'] },
        loadComponent: () =>
          import('./features/dashboard/email-logs/email-logs').then((m) => m.EmailLogs),
        title: 'Email logs · WorkProvider360',
      },
      {
        path: 'announcements',
        loadComponent: () =>
          import('./features/dashboard/announcements/announcements').then((m) => m.Announcements),
        title: 'Announcements · WorkProvider360',
      },
      {
        path: 'accounting',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] },
        loadComponent: () =>
          import('./features/dashboard/accounting/accounting').then((m) => m.Accounting),
        title: 'Accounting · WorkProvider360',
      },
      {
        path: 'security',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] },
        loadComponent: () => import('./features/dashboard/security/security').then((m) => m.Security),
        title: 'Security · WorkProvider360',
      },
      {
        path: 'pos',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin'] },
        loadComponent: () => import('./features/dashboard/pos/pos').then((m) => m.Pos),
        title: 'Point of Sale · WorkProvider360',
      },
      {
        path: 'scheduler',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'User'] },
        loadComponent: () => import('./features/dashboard/scheduler/scheduler').then((m) => m.Scheduler),
        title: 'Scheduler · WorkProvider360',
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Manager', 'User'] },
        loadComponent: () => import('./features/dashboard/reports/reports').then((m) => m.Reports),
        title: 'Reports · WorkProvider360',
      },
      {
        path: 'live-map',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Manager'] },
        loadComponent: () => import('./features/dashboard/live-map/live-map').then((m) => m.LiveMap),
        title: 'Live map · WorkProvider360',
      },
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin', 'Admin', 'Manager'] },
        loadComponent: () => import('./features/dashboard/settings/settings').then((m) => m.Settings),
        title: 'Settings · WorkProvider360',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/profile/profile').then((m) => m.Profile),
        title: 'Profile · WorkProvider360',
      },
      {
        path: 'help',
        loadComponent: () => import('./features/dashboard/help/help').then((m) => m.Help),
        title: 'Help Center · WorkProvider360',
      },
      {
        path: 'support',
        loadComponent: () => import('./features/dashboard/support/support').then((m) => m.Support),
        title: 'Support · WorkProvider360',
      },
      {
        path: 'about',
        loadComponent: () => import('./features/dashboard/about/about').then((m) => m.About),
        title: 'About · WorkProvider360',
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
