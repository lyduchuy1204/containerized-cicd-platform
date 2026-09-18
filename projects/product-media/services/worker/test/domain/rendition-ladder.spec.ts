import { buildOutputFilename, resolveRenditionSet } from '../../src/domain/rendition-ladder';

describe('resolveRenditionSet', () => {
  it('returns all four renditions for a 4K source', () => {
    const targets = resolveRenditionSet(3840, 2160);
    expect(targets.map((target) => target.label)).toEqual(['2k', '1080p', '720p', '480p']);
  });

  it('orders targets largest to smallest', () => {
    const heights = resolveRenditionSet(3840, 2160).map((target) => target.height);
    expect(heights).toEqual([...heights].sort((left, right) => right - left));
  });

  it('never upscales a 720p source', () => {
    const targets = resolveRenditionSet(1280, 720);
    expect(targets.map((target) => target.label)).toEqual(['720p', '480p']);
  });

  it('returns only the smallest rendition for a 480p source', () => {
    expect(resolveRenditionSet(854, 480).map((target) => target.label)).toEqual(['480p']);
  });

  it('returns nothing for a source below the smallest rendition', () => {
    expect(resolveRenditionSet(320, 240)).toEqual([]);
  });

  it('preserves the aspect ratio with an even width', () => {
    for (const target of resolveRenditionSet(3840, 2160)) {
      expect(target.width % 2).toBe(0);
      expect(target.width / target.height).toBeCloseTo(3840 / 2160, 1);
    }
  });

  it('derives an even width from an odd source ratio', () => {
    for (const target of resolveRenditionSet(1919, 1079)) {
      expect(target.width % 2).toBe(0);
    }
  });
});

describe('buildOutputFilename', () => {
  it('maps each label to an mp4 filename', () => {
    expect(buildOutputFilename('2k')).toBe('2k.mp4');
    expect(buildOutputFilename('1080p')).toBe('1080p.mp4');
    expect(buildOutputFilename('720p')).toBe('720p.mp4');
    expect(buildOutputFilename('480p')).toBe('480p.mp4');
  });
});
