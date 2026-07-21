/** Returned on successful login / token refresh. Mirrors `AuthResponseDto`. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresOn: string;
  agencyId: number;
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
}

/** The authenticated user as held in the frontend session. */
export interface SessionUser {
  agencyId: number;
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Register = bootstrap the first SuperAdmin for a tenant. */
export interface BootstrapAdminRequest {
  email: string;
  fullName: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}
