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
