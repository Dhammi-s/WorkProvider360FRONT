/** Safe, outward-facing projection of a user. Mirrors the backend `UserDto`. */
export interface UserDto {
  userId: number;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdOn: string;
}

/** Payload for admin-driven user creation (`POST /api/users`). */
export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  roleId: number;
}
