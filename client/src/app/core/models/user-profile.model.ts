/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ServiceType } from './service-type.model';

/** One weekly availability range. dayOfWeek is 0 (Sun) - 6 (Sat); times are "HH:mm". */
export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UserProfile {
  userId: number;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  qualifications?: string | null;
  yearsOfExperience?: number | null;
  about?: string | null;
  hasDrivingLicense: boolean;
  hasVehicle: boolean;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  hireDate?: string | null;
  skills: ServiceType[];
  availability: AvailabilitySlot[];
}

export interface UpsertUserProfileRequest {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  qualifications?: string | null;
  yearsOfExperience?: number | null;
  about?: string | null;
  hasDrivingLicense: boolean;
  hasVehicle: boolean;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  hireDate?: string | null;
  serviceTypeIds: number[];
  availability: AvailabilitySlot[];
}
