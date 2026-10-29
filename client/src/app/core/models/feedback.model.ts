/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-29
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Client feedback on a visit and its caregiver. Mirrors the backend VisitFeedbackDtos. */
export interface VisitFeedback {
  feedbackId: number;
  scheduleId: number;
  scheduleTitle: string;
  startUtc: string;
  endUtc: string;
  serviceTypeName?: string | null;
  clientId: number;
  clientName: string;
  caregiverUserId: number;
  caregiverName: string;
  visitRating: number;
  caregiverRating: number;
  comment?: string | null;
  createdOn: string;
  updatedOn?: string | null;
}

export interface VisitFeedbackRequest {
  visitRating: number;
  caregiverRating: number;
  comment?: string | null;
}

/** Client portal: can this visit be rated yet, and what was given. */
export interface PortalVisitFeedback {
  canGiveFeedback: boolean;
  reason?: string | null;
  feedback?: VisitFeedback | null;
}

export interface VisitFeedbackSummary {
  total: number;
  averageVisitRating?: number | null;
  averageCaregiverRating?: number | null;
  /** Caregiver ratings by stars: index 0 = 1 star … index 4 = 5 stars. */
  starCounts: number[];
}

export interface CaregiverFeedback {
  summary: VisitFeedbackSummary;
  items: VisitFeedback[];
  page: number;
  pageSize: number;
}
