import { describe, expect, it } from 'vitest';
import { hasPendingMedia, resolvePollIntervalMs } from '../src/lib/poll-schedule';
import { buildMedia } from './media-fixtures';

describe('resolvePollIntervalMs', () => {
  it('uses three seconds for the first three polls', () => {
    expect(resolvePollIntervalMs(0)).toBe(3000);
    expect(resolvePollIntervalMs(1)).toBe(3000);
    expect(resolvePollIntervalMs(2)).toBe(3000);
  });

  it('uses five seconds for the next three polls', () => {
    expect(resolvePollIntervalMs(3)).toBe(5000);
    expect(resolvePollIntervalMs(4)).toBe(5000);
    expect(resolvePollIntervalMs(5)).toBe(5000);
  });

  it('settles at ten seconds afterwards', () => {
    expect(resolvePollIntervalMs(6)).toBe(10000);
    expect(resolvePollIntervalMs(50)).toBe(10000);
  });
});

describe('hasPendingMedia', () => {
  it('reports false for an empty list', () => {
    expect(hasPendingMedia([])).toBe(false);
  });

  it('reports false when every item is terminal', () => {
    const mediaList = [
      buildMedia({ id: 'a', status: 'COMPLETED' }),
      buildMedia({ id: 'b', status: 'FAILED' }),
    ];
    expect(hasPendingMedia(mediaList)).toBe(false);
  });

  it.each(['UPLOADING', 'QUEUED', 'PROCESSING'] as const)(
    'reports true when an item is %s',
    (status) => {
      const mediaList = [
        buildMedia({ id: 'a', status: 'COMPLETED' }),
        buildMedia({ id: 'b', status }),
      ];
      expect(hasPendingMedia(mediaList)).toBe(true);
    },
  );
});
