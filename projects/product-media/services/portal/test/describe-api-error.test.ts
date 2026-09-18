import { describe, expect, it } from 'vitest';
import { describeApiError } from '../src/lib/describe-api-error';

describe('describeApiError', () => {
  it('keeps the selection for a rejected upload size', () => {
    const presentation = describeApiError({
      code: 'UPLOAD_TOO_LARGE',
      message: 'Upload exceeds the limit of 524288000 bytes',
    });
    expect(presentation.keepsSelection).toBe(true);
    expect(presentation.isRetryable).toBe(false);
    expect(presentation.detail).toBe('Upload exceeds the limit of 524288000 bytes');
  });

  it('offers retry for a temporary storage problem', () => {
    const presentation = describeApiError({
      code: 'STORAGE_UNAVAILABLE',
      message: 'Storage is unavailable',
    });
    expect(presentation.isRetryable).toBe(true);
  });

  it('does not offer retry for an unsupported type', () => {
    const presentation = describeApiError({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Only MP4 uploads are accepted',
    });
    expect(presentation.isRetryable).toBe(false);
    expect(presentation.keepsSelection).toBe(true);
  });

  it('falls back to the api message for a code it has not seen', () => {
    const presentation = describeApiError({
      code: 'SOME_FUTURE_CODE',
      message: 'A new failure mode',
    });
    expect(presentation.detail).toBe('A new failure mode');
    expect(presentation.isRetryable).toBe(true);
  });

  it('falls back to a generic sentence when the message is empty', () => {
    const presentation = describeApiError({ code: 'SOME_FUTURE_CODE', message: '' });
    expect(presentation.detail.length).toBeGreaterThan(0);
  });

  it('covers every code published by the api', () => {
    const publishedCodes = [
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
    ];
    for (const code of publishedCodes) {
      const presentation = describeApiError({ code, message: 'detail' });
      expect(presentation.headline).not.toBe('Something went wrong');
    }
  });
});
