/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/**
 * Static, well-known role identifiers. These IDs are fixed across every tenant
 * and match `RoleConstants` on the backend.
 */
export enum Role {
  SuperAdmin = 1,
  Admin = 2,
  Manager = 3,
  User = 4,
  Client = 5,
}

/** Role names exactly as they appear in JWT claims / DTOs. */
export type RoleName = 'SuperAdmin' | 'Admin' | 'Manager' | 'User' | 'Client';

export const ROLE_LABELS: Record<RoleName, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Administrator',
  Manager: 'Manager',
  User: 'Team Member',
  Client: 'Client',
};

export interface RoleDto {
  roleId: number;
  roleName: string;
  isActive: boolean;
}
