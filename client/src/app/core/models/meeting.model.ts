/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-09
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Mirrors the backend meeting scheduling DTOs. Times are ISO-8601 UTC strings. */

export type MeetingAccessLevel = 'None' | 'Read' | 'Write';
export type MeetingType       = 'InPerson' | 'Online' | 'Hybrid';
export type MeetingStatus     = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
export type ParticipantRole   = 'Host' | 'Attendee' | 'Optional';
export type ParticipantStatus = 'Pending' | 'Accepted' | 'Declined' | 'Tentative';
export type PaymentMethod     = 'Cash' | 'Online';
export type PaymentStatus     = 'Pending' | 'Paid' | 'Refunded';

// ---------------------------------------------------------------- Settings

export interface MeetingSettings {
  adminAccess: MeetingAccessLevel;
  managerAccess: MeetingAccessLevel;
  userCanCreate: boolean;
  allowClientParticipants: boolean;
  allowPaidMeetings: boolean;
  defaultFeePerParticipant: number;
  requireApproval: boolean;
  notifyOnCreate: boolean;
  notifyOnUpdate: boolean;
  notifyOnCancel: boolean;
  maxParticipantsDefault: number;
  updatedOn: string;
}

export interface UpdateMeetingSettingsRequest {
  adminAccess: MeetingAccessLevel;
  managerAccess: MeetingAccessLevel;
  userCanCreate: boolean;
  allowClientParticipants: boolean;
  allowPaidMeetings: boolean;
  defaultFeePerParticipant: number;
  requireApproval: boolean;
  notifyOnCreate: boolean;
  notifyOnUpdate: boolean;
  notifyOnCancel: boolean;
  maxParticipantsDefault: number;
}

export interface MeetingAccess {
  access: MeetingAccessLevel;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManagePayments: boolean;
  canViewAll: boolean;
}

// --------------------------------------------------------------- Meeting

export interface Meeting {
  meetingId: number;
  title: string;
  description?: string | null;
  startUtc: string;
  endUtc: string;
  location?: string | null;
  meetingType: MeetingType;
  status: MeetingStatus;
  isPaid: boolean;
  feePerParticipant?: number | null;
  createdByUserId: number;
  createdByName?: string | null;
  maxParticipants?: number | null;
  notes?: string | null;
  colorTag?: string | null;
  participantCount: number;
  createdOn: string;
  updatedOn: string;
}

export interface MeetingDetail extends Meeting {
  participants: MeetingParticipant[];
}

export interface CreateMeetingRequest {
  title: string;
  description?: string | null;
  startUtc: string;
  endUtc: string;
  location?: string | null;
  meetingType: MeetingType;
  isPaid: boolean;
  feePerParticipant?: number | null;
  maxParticipants?: number | null;
  notes?: string | null;
  colorTag?: string | null;
  participantUserIds?: number[] | null;
  participantClientIds?: number[] | null;
}

export interface UpdateMeetingRequest {
  title: string;
  description?: string | null;
  startUtc: string;
  endUtc: string;
  location?: string | null;
  meetingType: MeetingType;
  isPaid: boolean;
  feePerParticipant?: number | null;
  maxParticipants?: number | null;
  notes?: string | null;
  colorTag?: string | null;
}

// ---------------------------------------------------------- Participant

export interface MeetingParticipant {
  participantId: number;
  meetingId: number;
  userId?: number | null;
  participantName?: string | null;
  participantEmail?: string | null;
  participantRoleName?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  clientEmail?: string | null;
  participantRole: ParticipantRole;
  status: ParticipantStatus;
  isPaid: boolean;
  paymentAmount?: number | null;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  invitedAt: string;
  respondedAt?: string | null;
}

export interface AddParticipantRequest {
  userId?: number | null;
  clientId?: number | null;
  participantRole: ParticipantRole;
}

export interface RespondMeetingRequest {
  status: ParticipantStatus;
}

// ------------------------------------------------------------ Payment

export interface MeetingPayment {
  paymentId: number;
  meetingId: number;
  participantId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  notes?: string | null;
  paidAt: string;
  recordedByUserId: number;
  recordedByName?: string | null;
  participantUserId?: number | null;
  participantName?: string | null;
  participantClientId?: number | null;
  participantClientName?: string | null;
}

export interface RecordPaymentRequest {
  participantId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  notes?: string | null;
}

export interface MeetingPaymentSummary {
  totalParticipants: number;
  paidParticipants: number;
  unpaidParticipants: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
}
