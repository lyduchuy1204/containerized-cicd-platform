import { ApiError } from '../types/api-error';

const FALLBACK_CODE = 'INTERNAL_ERROR';
const FALLBACK_MESSAGE = 'The request could not be completed.';

export class ApiRequestError extends Error {
  readonly code: string;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.code = apiError.code;
  }

  toApiError(): ApiError {
    return { code: this.code, message: this.message };
  }
}

export function toApiError(candidate: unknown): ApiError {
  if (candidate instanceof ApiRequestError) {
    return candidate.toApiError();
  }
  if (candidate instanceof Error) {
    return { code: FALLBACK_CODE, message: candidate.message };
  }
  return { code: FALLBACK_CODE, message: FALLBACK_MESSAGE };
}
