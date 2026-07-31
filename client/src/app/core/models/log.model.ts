/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export type EmailStatus = 'Sent' | 'Failed';

export interface EmailLog {
  emailLogId: string;
  toAddress: string;
  subject?: string | null;
  body?: string | null;
  status: EmailStatus;
  errorMessage?: string | null;
  createdOn: string;
}

export interface LogAccess {
  canView: boolean;
  canManageAccess: boolean;
}

export interface LogSettings {
  adminCanViewLogs: boolean;
  managerCanViewLogs: boolean;
  updatedOn: string;
}

export interface UpdateLogSettings {
  adminCanViewLogs: boolean;
  managerCanViewLogs: boolean;
}
