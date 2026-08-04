/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Safe, outward-facing projection of a user. Mirrors the backend `UserDto`. */
export interface UserDto {
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  officeId?: string | null;
  officeName?: string | null;
  salary?: number | null;
  isActive: boolean;
  isLockedOut: boolean;
  createdOn: string;
}

/** Payload for admin-driven user creation (`POST /api/users`). */
export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  roleId: number;
  phone?: string | null;
  officeId?: string | null;
}

/** Manual SMS send (`POST /api/sms/send`). */
export interface SendSmsRequest {
  userId?: number | null;
  toNumber?: string | null;
  message: string;
}
