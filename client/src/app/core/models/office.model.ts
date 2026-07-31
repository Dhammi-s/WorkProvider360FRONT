/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export interface Timezone {
  timezoneId: string;
  timezoneName: string;
  description?: string | null;
}

export interface Office {
  officeId: string;
  officeName: string;
  address?: string | null;
  phone?: string | null;
  timezoneId?: string | null;
  timezoneName?: string | null;
  isActive: boolean;
  memberCount: number;
  createdOn: string;
}

export interface OfficeMember {
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
}

export interface CreateOfficeRequest {
  officeName: string;
  address?: string | null;
  phone?: string | null;
  timezoneId?: string | null;
}

export interface UpdateOfficeRequest {
  officeName: string;
  address?: string | null;
  phone?: string | null;
  timezoneId?: string | null;
  isActive: boolean;
}
