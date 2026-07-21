/**
 * Static, well-known role identifiers. These IDs are fixed across every tenant
 * and match `RoleConstants` on the backend.
 */
export enum Role {
  SuperAdmin = 1,
  Admin = 2,
  Manager = 3,
  User = 4,
}

/** Role names exactly as they appear in JWT claims / DTOs. */
export type RoleName = 'SuperAdmin' | 'Admin' | 'Manager' | 'User';

export const ROLE_LABELS: Record<RoleName, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Administrator',
  Manager: 'Manager',
  User: 'Team Member',
};

export interface RoleDto {
  roleId: number;
  roleName: string;
  isActive: boolean;
}
