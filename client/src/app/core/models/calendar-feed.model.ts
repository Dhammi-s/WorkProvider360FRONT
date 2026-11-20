/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** The signed-in user's private calendar feed. `url` is only returned by regenerate. */
export interface CalendarFeed {
  enabled: boolean;
  url: string | null;
  createdOn: string | null;
  lastAccessOn: string | null;
}
