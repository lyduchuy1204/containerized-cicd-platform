import {
  assertAcceptedUpload,
  assertWithinUploadLimit,
} from '../../src/domain/upload-validation';
import { MediaError } from '../../src/domain/media-error';

const MAX_UPLOAD_BYTES = 524288000;

function codeOf(action: () => void): string {
  try {
    action();
  } catch (error) {
    return (error as MediaError).code;
  }
  throw new Error('expected a rejection');
}

describe('assertAcceptedUpload', () => {
  it('accepts an mp4 with the standard mime type', () => {
    expect(() => assertAcceptedUpload('clip.mp4', 'video/mp4')).not.toThrow();
  });

  it('accepts the alternative mp4 mime type', () => {
    expect(() => assertAcceptedUpload('clip.mp4', 'application/mp4')).not.toThrow();
  });

  it('accepts an uppercase extension', () => {
    expect(() => assertAcceptedUpload('CLIP.MP4', 'VIDEO/MP4')).not.toThrow();
  });

  it('rejects a non mp4 extension', () => {
    expect(codeOf(() => assertAcceptedUpload('clip.mov', 'video/mp4'))).toBe(
      'UNSUPPORTED_MEDIA_TYPE',
    );
  });

  it('rejects a mismatched mime type even when the extension looks right', () => {
    expect(codeOf(() => assertAcceptedUpload('clip.mp4', 'text/plain'))).toBe(
      'UNSUPPORTED_MEDIA_TYPE',
    );
  });

  it('rejects an empty mime type, leaving the browser guess to the client', () => {
    expect(codeOf(() => assertAcceptedUpload('clip.mp4', ''))).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('assertWithinUploadLimit', () => {
  it('accepts a size below the limit', () => {
    expect(() => assertWithinUploadLimit(1024, MAX_UPLOAD_BYTES)).not.toThrow();
  });

  it('accepts a size exactly at the limit', () => {
    expect(() => assertWithinUploadLimit(MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES)).not.toThrow();
  });

  it('rejects a size one byte above the limit', () => {
    expect(codeOf(() => assertWithinUploadLimit(MAX_UPLOAD_BYTES + 1, MAX_UPLOAD_BYTES))).toBe(
      'UPLOAD_TOO_LARGE',
    );
  });

  it('states the limit in the message so the client can show it', () => {
    try {
      assertWithinUploadLimit(MAX_UPLOAD_BYTES + 1, MAX_UPLOAD_BYTES);
      throw new Error('expected a rejection');
    } catch (error) {
      expect((error as MediaError).message).toContain(String(MAX_UPLOAD_BYTES));
    }
  });
});
