import { calculateExpiresAt, isExpired } from '../../src/domain/expiry';
import { Media } from '../../src/domain/media';
import {
  isSourceFilename,
  originalsDirectory,
  processedDirectory,
  processedObjectPath,
  sourceObjectPath,
} from '../../src/domain/media-paths';

const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');
const MEDIA_ID = 'abc';

function buildMedia(expiresAt: Date): Media {
  return {
    mediaId: MEDIA_ID,
    filename: 'clip.mp4',
    sizeBytes: 1024,
    status: 'COMPLETED',
    progress: 100,
    renditions: [],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    expiresAt,
  };
}

describe('calculateExpiresAt', () => {
  it('adds the retention window in hours', () => {
    expect(calculateExpiresAt(CREATED_AT, 24).toISOString()).toBe('2026-09-02T00:00:00.000Z');
  });

  it('supports a one hour window', () => {
    expect(calculateExpiresAt(CREATED_AT, 1).toISOString()).toBe('2026-09-01T01:00:00.000Z');
  });
});

describe('isExpired', () => {
  it('reports not expired before the boundary', () => {
    const media = buildMedia(new Date('2026-09-02T00:00:00.000Z'));
    expect(isExpired(media, new Date('2026-09-01T23:59:59.000Z'))).toBe(false);
  });

  it('reports expired exactly at the boundary', () => {
    const media = buildMedia(new Date('2026-09-02T00:00:00.000Z'));
    expect(isExpired(media, new Date('2026-09-02T00:00:00.000Z'))).toBe(true);
  });

  it('reports expired after the boundary', () => {
    const media = buildMedia(new Date('2026-09-02T00:00:00.000Z'));
    expect(isExpired(media, new Date('2026-09-03T00:00:00.000Z'))).toBe(true);
  });
});

describe('media paths', () => {
  it('places the source under the originals branch', () => {
    expect(sourceObjectPath(MEDIA_ID)).toBe('originals/abc/source.mp4');
  });

  it('places renditions under the processed branch', () => {
    expect(processedObjectPath(MEDIA_ID, '1080p.mp4')).toBe('processed/abc/1080p.mp4');
  });

  it('exposes the two directories used when deleting media', () => {
    expect(originalsDirectory(MEDIA_ID)).toBe('originals/abc');
    expect(processedDirectory(MEDIA_ID)).toBe('processed/abc');
  });

  it('recognises only the source filename', () => {
    expect(isSourceFilename('source.mp4')).toBe(true);
    expect(isSourceFilename('1080p.mp4')).toBe(false);
    expect(isSourceFilename('thumbnail.jpg')).toBe(false);
  });
});
