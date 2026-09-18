import { assertPathInsideRoot, assertSafeFilename } from '../../src/domain/path-safety';
import { MediaError } from '../../src/domain/media-error';

const UPLOADS_ROOT = '/uploads';

describe('assertSafeFilename', () => {
  it('accepts a plain rendition filename', () => {
    expect(() => assertSafeFilename('1080p.mp4')).not.toThrow();
  });

  it('accepts the thumbnail filename', () => {
    expect(() => assertSafeFilename('thumbnail.jpg')).not.toThrow();
  });

  it.each(['../secret', 'nested/file.mp4', 'nested\\file.mp4', '..', '.', ''])(
    'rejects %p',
    (filename) => {
      expect(() => assertSafeFilename(filename)).toThrow(MediaError);
    },
  );

  it('reports the media not found code rather than leaking the reason', () => {
    try {
      assertSafeFilename('../etc/passwd');
      throw new Error('expected a rejection');
    } catch (error) {
      expect((error as MediaError).code).toBe('MEDIA_NOT_FOUND');
    }
  });
});

describe('assertPathInsideRoot', () => {
  it('accepts a path inside the uploads root', () => {
    expect(() => assertPathInsideRoot(UPLOADS_ROOT, 'originals/abc/source.mp4')).not.toThrow();
  });

  it('accepts the root itself', () => {
    expect(() => assertPathInsideRoot(UPLOADS_ROOT, '.')).not.toThrow();
  });

  it('rejects traversal above the root', () => {
    expect(() => assertPathInsideRoot(UPLOADS_ROOT, '../etc/passwd')).toThrow(MediaError);
  });

  it('rejects deep traversal that lands outside the root', () => {
    expect(() => assertPathInsideRoot(UPLOADS_ROOT, 'originals/../../etc/passwd')).toThrow(
      MediaError,
    );
  });

  it('rejects a sibling directory sharing the root name prefix', () => {
    expect(() => assertPathInsideRoot(UPLOADS_ROOT, '../uploads-backup/secret')).toThrow(
      MediaError,
    );
  });
});
