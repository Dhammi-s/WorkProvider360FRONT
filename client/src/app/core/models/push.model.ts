/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-04
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export interface PushEvent {
  key: string;
  category: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface PushSettings {
  enabled: boolean;
  /** False until the Firebase service-account key is set on the server. */
  serverConfigured: boolean;
  events: PushEvent[];
}

export interface UpdatePushSettings {
  enabled: boolean;
  events: Record<string, boolean>;
}
