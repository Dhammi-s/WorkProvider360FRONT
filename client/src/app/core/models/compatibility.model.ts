/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Client–caregiver compatibility: care attributes, client rules, caregiver care profile. */

export type AttributeRequirement = 'Required' | 'Preferred' | 'Avoid';
export type CaregiverPreference = 'Preferred' | 'Blocked';
export type CaregiverGender = 'Female' | 'Male';

export interface CareAttribute {
  attributeId: number;
  name: string;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  clientCount: number;
  caregiverCount: number;
}

export interface SaveCareAttributeRequest {
  name: string;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ClientAttributeRule {
  attributeId: number;
  name?: string;
  category?: string | null;
  requirement: AttributeRequirement;
  isActive?: boolean;
}

export interface ClientCaregiverRule {
  userId: number;
  fullName?: string;
  preference: CaregiverPreference;
  note: string | null;
  isActive?: boolean;
  createdOn?: string | null;
}

export interface ClientCompatibility {
  clientId: number;
  clientName: string;
  latitude: number | null;
  longitude: number | null;
  preferredCaregiverGender: CaregiverGender | 'Any' | null;
  attributes: ClientAttributeRule[];
  caregivers: ClientCaregiverRule[];
}

export interface SaveClientCompatibility {
  preferredCaregiverGender: CaregiverGender | null;
  attributes: { attributeId: number; requirement: AttributeRequirement }[];
  caregivers: { userId: number; preference: CaregiverPreference; note: string | null }[];
}

export interface CareProfile {
  userId: number;
  fullName: string;
  gender: string | null;
  attributeIds: number[];
  attributes: CareAttribute[];
  latitude: number | null;
  longitude: number | null;
}

export interface SaveCareProfile {
  attributeIds: number[];
  latitude: number | null;
  longitude: number | null;
}
