/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Routes } from '@angular/router';
import { monitoringAuthGuard, monitoringHomeGuard } from './auth/monitoring-auth.guard';
import { monitoringPermissionGuard } from './auth/monitoring-permission.guard';

const T = ' · Development Monitoring';

/** Lazy routes mounted under /monitoring. */
export const MONITORING_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/monitoring-login').then((m) => m.MonitoringLogin),
    title: 'Sign in' + T,
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/monitoring-reset-password').then((m) => m.MonitoringResetPassword),
    title: 'Reset password' + T,
  },
  {
    // Reachable while mustChangePassword is set, so it is outside the guarded shell.
    path: 'change-password',
    canActivate: [monitoringAuthGuard],
    data: { allowMustChange: true },
    loadComponent: () => import('./auth/monitoring-change-password').then((m) => m.MonitoringChangePassword),
    title: 'Change password' + T,
  },
  {
    path: '',
    canActivate: [monitoringAuthGuard],
    loadComponent: () => import('./layout/monitoring-layout').then((m) => m.MonitoringLayout),
    children: [
      { path: '', pathMatch: 'full', canActivate: [monitoringHomeGuard], children: [] },
      {
        path: 'dashboard',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'dashboard.view' },
        loadComponent: () => import('./dashboard/monitoring-dashboard').then((m) => m.MonitoringDashboard),
        title: 'Dashboard' + T,
      },
      {
        path: 'api-performance',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'apiperformance.view' },
        loadComponent: () => import('./api-performance/monitoring-api-performance').then((m) => m.MonitoringApiPerformance),
        title: 'API Performance' + T,
      },
      {
        path: 'logs',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'logs.view' },
        loadComponent: () => import('./application-logs/monitoring-logs').then((m) => m.MonitoringLogs),
        title: 'Application Logs' + T,
      },
      {
        path: 'errors',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'errors.view' },
        loadComponent: () => import('./error-tracking/monitoring-errors').then((m) => m.MonitoringErrors),
        title: 'Error Tracking' + T,
      },
      {
        path: 'tenants',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'tenants.view' },
        loadComponent: () => import('./tenant-monitoring/monitoring-tenants').then((m) => m.MonitoringTenants),
        title: 'Tenant Monitoring' + T,
      },
      {
        path: 'database',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'database.view' },
        loadComponent: () => import('./database-monitoring/monitoring-database').then((m) => m.MonitoringDatabase),
        title: 'Database Monitoring' + T,
      },
      {
        path: 'developers',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'users.manage' },
        loadComponent: () => import('./developer-management/monitoring-developers').then((m) => m.MonitoringDevelopers),
        title: 'Developer Management' + T,
      },
      {
        path: 'audit',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'audit.view' },
        loadComponent: () => import('./audit-logs/monitoring-audit').then((m) => m.MonitoringAudit),
        title: 'Audit Logs' + T,
      },
      {
        path: 'settings',
        canActivate: [monitoringPermissionGuard],
        data: { permission: 'settings.view' },
        loadComponent: () => import('./settings/monitoring-settings').then((m) => m.MonitoringSettings),
        title: 'Settings' + T,
      },
      {
        path: 'no-access',
        loadComponent: () => import('./shared/monitoring-no-access').then((m) => m.MonitoringNoAccess),
        title: 'No access' + T,
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
