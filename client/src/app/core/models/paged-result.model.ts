/** A single page of results plus the total count. Mirrors `PagedResultDto<T>`. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
