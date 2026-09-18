import { ValidationResult } from '../types/validation';
import { formatBytes } from './format-bytes';

const ACCEPTED_EXTENSION = '.mp4';
const ACCEPTED_MIME_TYPES: readonly string[] = ['video/mp4', 'application/mp4'];

const VALID: ValidationResult = { isValid: true };

export function validateSelectedFile(file: File, maxBytes: number): ValidationResult {
  if (!hasAcceptedExtension(file.name)) {
    return { isValid: false, reason: 'Only MP4 files are accepted.' };
  }
  if (!hasAcceptedMimeType(file.type)) {
    return { isValid: false, reason: 'That file does not look like an MP4 video.' };
  }
  if (file.size === 0) {
    return { isValid: false, reason: 'That file is empty.' };
  }
  if (file.size > maxBytes) {
    return {
      isValid: false,
      reason: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`,
    };
  }
  return VALID;
}

function hasAcceptedExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith(ACCEPTED_EXTENSION);
}

function hasAcceptedMimeType(mimeType: string): boolean {
  if (mimeType.length === 0) {
    return true;
  }
  return ACCEPTED_MIME_TYPES.includes(mimeType.toLowerCase());
}
