/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export interface Announcement {
  announcementId: string;
  title: string;
  message: string;
  isActive: boolean;
  createdOn: string;
}

export interface AnnouncementView {
  canView: boolean;
  canManage: boolean;
  announcements: Announcement[];
}

export interface AnnouncementSettings {
  showToAdmin: boolean;
  showToManager: boolean;
  showToUser: boolean;
  updatedOn: string;
}

export interface CreateAnnouncement {
  title: string;
  message: string;
}

export interface UpdateAnnouncementSettings {
  showToAdmin: boolean;
  showToManager: boolean;
  showToUser: boolean;
}
