/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ServiceType } from './service-type.model';
import { TimeEntry, TimeEntrySignature } from './scheduler.model';

export interface ClientVisit {
  scheduleId: number;
  title: string;
  clientId?: number | null;
  serviceTypeId?: number | null;
  serviceTypeName?: string | null;
  assignedUserId: number;
  assignedUserName: string;
  assignedUserAvatarUrl?: string | null;
  location?: string | null;
  startUtc: string;
  endUtc: string;
  status: string;
  clockInUtc?: string | null;
  clockOutUtc?: string | null;
  workedSeconds: number;
  hasClockOutSignature: boolean;
}

export interface ClientVisitDetail extends ClientVisit {
  timeEntries: TimeEntry[];
  signatures: TimeEntrySignature[];
}

export interface PortalDashboard {
  nextVisit?: ClientVisit | null;
  todayVisits: ClientVisit[];
  upcomingCount: number;
  completedCount: number;
  totalHoursThisMonth: number;
  services: ServiceType[];
}

export interface PortalProfile {
  clientId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  preferredLanguage?: string | null;
  accessInstructions?: string | null;
  status: string;
  serviceTypes: ServiceType[];
}

export interface UpdatePortalProfileRequest {
  phone?: string | null;
  alternatePhone?: string | null;
  accessInstructions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  preferredLanguage?: string | null;
}
