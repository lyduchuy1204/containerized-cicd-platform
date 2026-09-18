import { Media, Rendition } from '../src/types/media';

const BASE_MEDIA: Media = {
  id: 'media-1',
  filename: 'sample.mp4',
  sizeBytes: 604648,
  status: 'COMPLETED',
  progress: 100,
  sourceWidth: 3840,
  sourceHeight: 2160,
  durationSeconds: 4,
  thumbnailUrl: '/files/media-1/thumbnail.jpg',
  renditions: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:30.000Z',
};

export function buildRendition(overrides: Partial<Rendition> = {}): Rendition {
  return {
    label: '1080p',
    width: 1920,
    height: 1080,
    sizeBytes: 122507,
    url: '/files/media-1/1080p.mp4',
    ...overrides,
  };
}

export function buildMedia(overrides: Partial<Media> = {}): Media {
  return { ...BASE_MEDIA, ...overrides };
}
