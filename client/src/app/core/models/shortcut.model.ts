/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { RoleName } from './role.model';

/** A user-defined keyboard shortcut. Mirrors the backend UserShortcutDto. */
export interface Shortcut {
  keyCombo: string;
  actionKey: string;
}

/** A navigable action a shortcut can target. */
export interface ShortcutAction {
  actionKey: string;
  label: string;
  path: string;
  roles: RoleName[];
}

const STAFF: RoleName[] = ['SuperAdmin', 'Admin', 'Manager', 'User'];

/**
 * The catalog of actions a shortcut can point to. Filtered by the current role
 * so a user only sees (and can only jump to) places they can reach.
 */
export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  // Staff
  { actionKey: 'dashboard.home', label: 'Go to Overview', path: '/dashboard', roles: STAFF },
  { actionKey: 'dashboard.clients', label: 'Go to Clients', path: '/dashboard/clients', roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { actionKey: 'dashboard.serviceTypes', label: 'Go to Skills & Services', path: '/dashboard/service-types', roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { actionKey: 'dashboard.scheduler', label: 'Go to Scheduler', path: '/dashboard/scheduler', roles: STAFF },
  { actionKey: 'dashboard.reports', label: 'Go to Reports', path: '/dashboard/reports', roles: STAFF },
  { actionKey: 'dashboard.users', label: 'Go to Team', path: '/dashboard/users', roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { actionKey: 'dashboard.applications', label: 'Go to Applications', path: '/dashboard/applications', roles: ['SuperAdmin', 'Admin'] },
  { actionKey: 'dashboard.offices', label: 'Go to Offices', path: '/dashboard/offices', roles: ['SuperAdmin', 'Admin'] },
  { actionKey: 'dashboard.liveMap', label: 'Go to Live Map', path: '/dashboard/live-map', roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { actionKey: 'dashboard.announcements', label: 'Go to Announcements', path: '/dashboard/announcements', roles: STAFF },
  { actionKey: 'dashboard.accounting', label: 'Go to Accounting', path: '/dashboard/accounting', roles: ['SuperAdmin'] },
  { actionKey: 'dashboard.pos', label: 'Go to Point of Sale', path: '/dashboard/pos', roles: ['SuperAdmin', 'Admin'] },
  { actionKey: 'dashboard.security', label: 'Go to Security', path: '/dashboard/security', roles: ['SuperAdmin'] },
  { actionKey: 'dashboard.settings', label: 'Go to Settings', path: '/dashboard/settings', roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { actionKey: 'dashboard.profile', label: 'Go to My Profile', path: '/dashboard/profile', roles: STAFF },
  // Client portal
  { actionKey: 'portal.home', label: 'Go to Home', path: '/portal', roles: ['Client'] },
  { actionKey: 'portal.calendar', label: 'Go to Calendar', path: '/portal/calendar', roles: ['Client'] },
  { actionKey: 'portal.visits', label: 'Go to My Visits', path: '/portal/visits', roles: ['Client'] },
  { actionKey: 'portal.services', label: 'Go to Services', path: '/portal/services', roles: ['Client'] },
  { actionKey: 'portal.profile', label: 'Go to My Profile', path: '/portal/profile', roles: ['Client'] },
];
