/**
 * Uniform response envelope returned by every WorkProvider360 API endpoint.
 * Mirrors the backend `ApiResponse<T>` DTO.
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
}
