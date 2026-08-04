/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { RoleDto } from './role.model';

export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Question {
  questionId: number;
  questionText: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

/** Config for the anonymous application form. */
export interface PublicFormConfig {
  roles: RoleDto[];
  questions: Question[];
  requirePhone: boolean;
  requireAddress: boolean;
}

export interface SubmitAnswer {
  questionId: number;
  answerText: string | null;
}

export interface SubmitApplicationRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  requestedRoleId: number;
  desiredSalary?: number | null;
  answers: SubmitAnswer[];
}

export interface ApplicationListItem {
  applicationId: number;
  fullName: string;
  email: string;
  requestedRoleId: number;
  requestedRoleName: string;
  desiredSalary?: number | null;
  status: ApplicationStatus;
  createdOn: string;
}

export interface ApplicationAnswer {
  questionId?: number | null;
  questionText: string;
  answerText?: string | null;
}

export interface ApplicationDetail {
  applicationId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  requestedRoleId: number;
  requestedRoleName: string;
  desiredSalary?: number | null;
  status: ApplicationStatus;
  rejectionReason?: string | null;
  reviewedOn?: string | null;
  createdOn: string;
  answers: ApplicationAnswer[];
}

export interface ApplicationSettings {
  requirePhone: boolean;
  requireAddress: boolean;
  emailNotificationsEnabled: boolean;
  notificationEmail?: string | null;
  allowStaffUnlock: boolean;
  updatedOn: string;
}

export interface UpsertApplicationSettings {
  requirePhone: boolean;
  requireAddress: boolean;
  emailNotificationsEnabled: boolean;
  notificationEmail?: string | null;
  allowStaffUnlock: boolean;
}

export interface CreateQuestionRequest {
  questionText: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface UpdateQuestionRequest {
  questionText: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}
