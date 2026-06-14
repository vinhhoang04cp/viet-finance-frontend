/**
 * Minimal shape of a Spring Data `Page<T>` response.
 *
 * The revenue list endpoint (`GET /api/v1/revenues`) is paginated and returns
 * this envelope; the invoice list endpoint returns a plain array.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Current page index (0-based). */
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}
