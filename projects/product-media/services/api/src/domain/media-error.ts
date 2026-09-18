import { ErrorCode } from './error-code';

export class MediaError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
  }
}

export function uploadTooLarge(maxUploadBytes: number): MediaError {
  return new MediaError('UPLOAD_TOO_LARGE', `Upload exceeds the limit of ${maxUploadBytes} bytes`);
}

export function unsupportedMediaType(): MediaError {
  return new MediaError('UNSUPPORTED_MEDIA_TYPE', 'Only MP4 uploads are accepted');
}

export function uploadIncomplete(): MediaError {
  return new MediaError('UPLOAD_INCOMPLETE', 'The upload did not complete');
}

export function mediaNotFound(): MediaError {
  return new MediaError('MEDIA_NOT_FOUND', 'Media not found');
}

export function mediaExpired(): MediaError {
  return new MediaError('MEDIA_EXPIRED', 'Media has passed its retention window');
}

export function mediaNotReady(): MediaError {
  return new MediaError('MEDIA_NOT_READY', 'Processing has not completed');
}

export function storageUnavailable(): MediaError {
  return new MediaError('STORAGE_UNAVAILABLE', 'Storage is unavailable');
}

