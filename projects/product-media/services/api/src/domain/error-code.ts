export const ERROR_CODES = [
  'UPLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UPLOAD_INCOMPLETE',
  'MEDIA_NOT_FOUND',
  'MEDIA_EXPIRED',
  'MEDIA_NOT_READY',
  'STORAGE_UNAVAILABLE',
  'DATABASE_UNAVAILABLE',
  'QUEUE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  UPLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UPLOAD_INCOMPLETE: 400,
  MEDIA_NOT_FOUND: 404,
  MEDIA_EXPIRED: 404,
  MEDIA_NOT_READY: 409,
  STORAGE_UNAVAILABLE: 503,
  DATABASE_UNAVAILABLE: 503,
  QUEUE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

const CLIENT_CODES: readonly ErrorCode[] = [
  'UPLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UPLOAD_INCOMPLETE',
  'MEDIA_NOT_FOUND',
  'MEDIA_EXPIRED',
  'MEDIA_NOT_READY',
];

export function httpStatusForCode(code: ErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}

export function isClientCode(code: ErrorCode): boolean {
  return CLIENT_CODES.includes(code);
}

