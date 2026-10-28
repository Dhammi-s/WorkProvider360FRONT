/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Help Center how-to video hosted in the agency's Cloudinary account. */
export interface HelpVideo {
  helpVideoId: number;
  title: string;
  description: string | null;
  topic: string;
  publicId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  bytes: number | null;
  showToAdmin: boolean;
  showToManager: boolean;
  showToUser: boolean;
  sortOrder: number;
  createdByName: string | null;
  createdOn: string;
}

export interface HelpVideoAccess {
  canManage: boolean;
  canManageSettings: boolean;
}

export interface HelpVideoSettings {
  adminCanManage: boolean;
  managerCanManage: boolean;
}

export interface SaveHelpVideoRequest {
  title: string;
  description: string | null;
  topic: string;
  showToAdmin: boolean;
  showToManager: boolean;
  showToUser: boolean;
  sortOrder: number;
}

export interface CreateHelpVideoRequest extends SaveHelpVideoRequest {
  publicId: string;
  videoUrl: string;
  durationSeconds: number | null;
  bytes: number | null;
}

/** Signed parameters for a direct browser upload to Cloudinary. */
export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  uploadUrl: string;
}

/** The part of Cloudinary's upload response we use. */
export interface CloudinaryVideoUpload {
  public_id: string;
  secure_url: string;
  duration?: number;
  bytes?: number;
}
