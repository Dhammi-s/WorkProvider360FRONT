/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ServiceType } from './service-type.model';

export type ClientStatus = 'Active' | 'OnHold' | 'Inactive';

export interface Client {
  clientId: number;
  userId?: number | null;
  officeId?: string | null;
  officeName?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  preferredLanguage?: string | null;
  accessInstructions?: string | null;
  careNotes?: string | null;
  allergies?: string | null;
  mobilityNotes?: string | null;
  portalEnabled: boolean;
  status: ClientStatus;
  startDate?: string | null;
  notes?: string | null;
  createdOn: string;
  updatedOn?: string | null;
  portalUserId?: number | null;
  portalEmail?: string | null;
  portalIsLockedOut: boolean;
  serviceTypes: ServiceType[];
}

export interface UpsertClientRequest {
  officeId?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  preferredLanguage?: string | null;
  accessInstructions?: string | null;
  careNotes?: string | null;
  allergies?: string | null;
  mobilityNotes?: string | null;
  startDate?: string | null;
  notes?: string | null;
  serviceTypeIds: number[];
}

export interface ClientAccess {
  roleName: string;
  accessLevel: 'None' | 'Read' | 'Write';
  isSuperAdmin: boolean;
  canViewAll: boolean;
  canManage: boolean;
  canManageServiceTypes: boolean;
  canManageSettings: boolean;
}

export interface ClientSettings {
  adminClientAccess: string;
  managerClientAccess: string;
  adminServiceTypeAccess: string;
  managerServiceTypeAccess: string;
  autoClockInEnabled: boolean;
  autoClockOutEnabled: boolean;
  requireClientSignatureOnClockIn: boolean;
  requireClientSignatureOnClockOut: boolean;
  requireSameOffice: boolean;
  requireMatchingSkill: boolean;
  captureClockLocation: boolean;
  clientPortalEnabled: boolean;
  sendClientCredentialsEmail: boolean;
  notifyClientOnSchedule: boolean;
  requireClientEmail: boolean;
  requireClientPhone: boolean;
  requireClientDateOfBirth: boolean;
  requireEmergencyContact: boolean;
  requireClientServiceTypes: boolean;
  updatedOn: string;
}

export type UpsertClientSettings = Omit<ClientSettings, 'updatedOn'>;

export interface EligibleCaregiver {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
  officeId?: string | null;
  officeName?: string | null;
  isSameOffice: boolean;
  hasSkill: boolean;
  skills: string[];
}

export interface SetPortalAccessRequest {
  enabled: boolean;
  sendEmail?: boolean | null;
}

export interface UpdateClientStatusRequest {
  status: ClientStatus;
}
