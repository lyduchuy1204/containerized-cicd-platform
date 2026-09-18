import { ApiError, ErrorPresentation } from '../types/api-error';

const GENERIC_HEADLINE = 'Something went wrong';
const GENERIC_DETAIL = 'The request could not be completed. Please try again.';

type PresentationTemplate = Omit<ErrorPresentation, 'detail'>;

const PRESENTATION_BY_CODE: Readonly<Record<string, PresentationTemplate>> = {
  UPLOAD_TOO_LARGE: {
    headline: 'That file is larger than the upload limit',
    isRetryable: false,
    keepsSelection: true,
  },
  UNSUPPORTED_MEDIA_TYPE: {
    headline: 'Only MP4 files are accepted',
    isRetryable: false,
    keepsSelection: true,
  },
  UPLOAD_INCOMPLETE: {
    headline: 'The upload did not finish',
    isRetryable: true,
    keepsSelection: true,
  },
  MEDIA_NOT_FOUND: {
    headline: 'That item is no longer available',
    isRetryable: false,
    keepsSelection: false,
  },
  MEDIA_EXPIRED: {
    headline: 'That item has passed its retention window',
    isRetryable: false,
    keepsSelection: false,
  },
  MEDIA_NOT_READY: {
    headline: 'Processing has not finished yet',
    isRetryable: false,
    keepsSelection: false,
  },
  STORAGE_UNAVAILABLE: {
    headline: 'Storage is temporarily unavailable',
    isRetryable: true,
    keepsSelection: true,
  },
  DATABASE_UNAVAILABLE: {
    headline: 'The service is temporarily unavailable',
    isRetryable: true,
    keepsSelection: true,
  },
  QUEUE_UNAVAILABLE: {
    headline: 'The service is temporarily unavailable',
    isRetryable: true,
    keepsSelection: true,
  },
  INTERNAL_ERROR: {
    headline: 'An unexpected problem occurred',
    isRetryable: true,
    keepsSelection: true,
  },
};

export function describeApiError(error: ApiError): ErrorPresentation {
  const template = PRESENTATION_BY_CODE[error.code];
  const detail = error.message.trim().length > 0 ? error.message : GENERIC_DETAIL;
  if (template === undefined) {
    return {
      headline: GENERIC_HEADLINE,
      detail,
      isRetryable: true,
      keepsSelection: true,
    };
  }
  return { ...template, detail };
}
