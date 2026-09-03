/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export interface ServiceType {
  serviceTypeId: number;
  name: string;
  description?: string | null;
  category?: string | null;
  colorTag?: string | null;
  sortOrder: number;
  isActive: boolean;
  clientCount?: number;
  userCount?: number;
  createdOn: string;
  updatedOn?: string | null;
}

export interface UpsertServiceTypeRequest {
  name: string;
  description?: string | null;
  category?: string | null;
  colorTag?: string | null;
  sortOrder: number;
  isActive?: boolean;
}
