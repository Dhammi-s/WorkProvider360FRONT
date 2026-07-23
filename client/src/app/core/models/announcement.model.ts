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
