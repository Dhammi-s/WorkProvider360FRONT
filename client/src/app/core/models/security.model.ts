/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Mirrors the backend security-audit DTOs. */

export interface SecurityEvent {
  securityEventId: string;
  eventType: string;
  email?: string | null;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  path?: string | null;
  detail?: string | null;
  createdOn: string;
}

export interface SecurityTypeCount {
  eventType: string;
  count: number;
}

export interface SecurityLoginStat {
  email: string;
  successCount: number;
  failedCount: number;
}

export interface SecurityStats {
  totalEvents: number;
  totalLogins: number;
  failedLogins: number;
  unauthorized: number;
  sqlInjectionAttempts: number;
  dosAttempts: number;
  typeCounts: SecurityTypeCount[];
  loginStats: SecurityLoginStat[];
  recent: SecurityEvent[];
}
