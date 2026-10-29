/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-28
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Mirrors the backend training-portal DTOs (SaaS.Core/Dtos/Outbound/TrainingDtos.cs). */

export type TrainingContentType = 'Video' | 'Document' | 'Quiz';
export type TrainingStatus = 'Assigned' | 'InProgress' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled';

export interface TrainingAuthResponse {
  accessToken: string;
  accessTokenExpiresOn: string;
  agencyId: number;
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  username: string;
}

/** The training-portal user as held in the (separate) training session. */
export interface TrainingSessionUser {
  agencyId: number;
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  username: string;
}

export interface TrainingCapabilities {
  canManageCatalog: boolean;
  canAssign: boolean;
  canApprove: boolean;
  canManageAccess: boolean;
  canSeeCredentials: boolean;
  canManageSettings: boolean;
  manageableRoles: string[];
}

export interface TrainingAccess {
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  officeName?: string | null;
  isActive: boolean;
  enabled: boolean;
  /** Super Admin only. */
  username?: string | null;
  enabledOn?: string | null;
  enabledByName?: string | null;
  lastLoginOn?: string | null;
  needsPasswordReset: boolean;
  openAssignments: number;
  completedAssignments: number;
  canManage: boolean;
}

export interface TrainingAccessResult {
  access: TrainingAccess;
  /** Shown once, Super Admin only. */
  generatedPassword?: string | null;
  emailSent: boolean;
}

export interface SetTrainingAccessRequest {
  enabled: boolean;
  username?: string | null;
  password?: string | null;
  sendEmail?: boolean;
}

export interface TrainingQuizQuestion {
  questionId: number;
  questionText: string;
  options: string[];
  /** Only for catalog managers. */
  correctOptionIndex?: number | null;
}

export interface Training {
  trainingId: number;
  title: string;
  description?: string | null;
  contentType: TrainingContentType;
  contentUrl?: string | null;
  publicId?: string | null;
  fileName?: string | null;
  durationMinutes?: number | null;
  passMarkPercent?: number | null;
  isActive: boolean;
  createdByName?: string | null;
  createdOn: string;
  updatedOn?: string | null;
  questionCount: number;
  openAssignments: number;
  completedAssignments: number;
  questions?: TrainingQuizQuestion[] | null;
}

export interface TrainingQuizQuestionInput {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface SaveTrainingRequest {
  title: string;
  description?: string | null;
  contentType: TrainingContentType;
  contentUrl?: string | null;
  publicId?: string | null;
  fileName?: string | null;
  durationMinutes?: number | null;
  passMarkPercent?: number | null;
  questions?: TrainingQuizQuestionInput[] | null;
}

export interface TrainingAssignment {
  assignmentId: number;
  trainingId: number;
  trainingTitle: string;
  contentType: TrainingContentType;
  passMarkPercent?: number | null;
  userId: number;
  userName: string;
  userEmail: string;
  userRoleName: string;
  assignedByUserId: number;
  assignedByName: string;
  assignedOn: string;
  dueDate: string;
  notes?: string | null;
  status: TrainingStatus;
  progressPercent: number;
  score?: number | null;
  startedOn?: string | null;
  submittedOn?: string | null;
  reviewedByName?: string | null;
  reviewedOn?: string | null;
  reviewComment?: string | null;
  isOverdue: boolean;
  canReview: boolean;
  canCancel: boolean;
}

export interface TrainingHistory {
  historyId: number;
  assignmentId: number;
  trainingTitle?: string | null;
  userName?: string | null;
  userRoleName?: string | null;
  fromStatus?: TrainingStatus | null;
  toStatus: TrainingStatus;
  progressPercent?: number | null;
  score?: number | null;
  comment?: string | null;
  changedByName?: string | null;
  changedOn: string;
  dueDate?: string | null;
}

export interface TrainingAssignmentDetail {
  assignment: TrainingAssignment;
  training: Training;
  history: TrainingHistory[];
}

export interface TrainingStats {
  total: number;
  assigned: number;
  inProgress: number;
  submitted: number;
  approved: number;
  rejected: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  averageScore?: number | null;
}

export interface TrainingDashboard {
  mine: TrainingStats;
  team?: TrainingStats | null;
  myOpen: TrainingAssignment[];
  awaitingMyApproval: TrainingAssignment[];
  recentActivity: TrainingHistory[];
}

export interface QuizResult {
  score: number;
  passMarkPercent: number;
  passed: boolean;
  correct: number;
  total: number;
  assignment: TrainingAssignment;
}

export interface AssignTrainingRequest {
  trainingId: number;
  userIds: number[];
  dueDate?: string | null;
  notes?: string | null;
}

export interface AssignTrainingResult {
  assigned: number;
  skipped: string[];
}

export interface TrainingSettings {
  remindersEnabled: boolean;
  overdueEmailsEnabled: boolean;
  defaultDueDays: number;
  lastReminderRunDate?: string | null;
}

/** Display labels and badge classes for statuses. */
export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  Assigned: 'Not started',
  InProgress: 'In progress',
  Submitted: 'Awaiting approval',
  Approved: 'Completed',
  Rejected: 'Needs redo',
  Cancelled: 'Cancelled',
};

export const TRAINING_STATUS_BADGE: Record<TrainingStatus, string> = {
  Assigned: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-sky-100 text-sky-700',
  Submitted: 'bg-amber-100 text-amber-800',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-orange-100 text-orange-700',
  Cancelled: 'bg-slate-100 text-slate-500',
};
