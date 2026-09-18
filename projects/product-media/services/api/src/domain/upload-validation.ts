import { unsupportedMediaType, uploadTooLarge } from './media-error';

const ACCEPTED_EXTENSION = '.mp4';
const ACCEPTED_MIME_TYPES = ['video/mp4', 'application/mp4'];

export function assertAcceptedUpload(filename: string, mimetype: string): void {
  const hasAcceptedExtension = filename.toLowerCase().endsWith(ACCEPTED_EXTENSION);
  const hasAcceptedMimeType = ACCEPTED_MIME_TYPES.includes(mimetype.toLowerCase());
  if (!hasAcceptedExtension || !hasAcceptedMimeType) {
    throw unsupportedMediaType();
  }
}

export function assertWithinUploadLimit(sizeBytes: number, maxUploadBytes: number): void {
  if (sizeBytes > maxUploadBytes) {
    throw uploadTooLarge(maxUploadBytes);
  }
}



