import { AcceptanceLimits, ProbeResult } from '../../src/domain/probe-result';
import { assertSourceAcceptable, SourceRejectedError } from '../../src/domain/source-acceptance';

const MP4_FAMILY_CONTAINER = 'mov,mp4,m4a,3gp,3g2,mj2';

function buildProbe(overrides: Partial<ProbeResult> = {}): ProbeResult {
  return {
    container: MP4_FAMILY_CONTAINER,
    videoCodec: 'h264',
    audioCodec: 'aac',
    videoStreamCount: 1,
    width: 3840,
    height: 2160,
    durationSeconds: 4,
    sizeBytes: 604648,
    ...overrides,
  };
}

function buildLimits(overrides: Partial<AcceptanceLimits> = {}): AcceptanceLimits {
  return {
    maxInputBytes: 524288000,
    maxDurationSeconds: 600,
    recordedSizeBytes: 604648,
    ...overrides,
  };
}

describe('assertSourceAcceptable', () => {
  it('accepts a 4K h264 source', () => {
    expect(() => assertSourceAcceptable(buildProbe(), buildLimits())).not.toThrow();
  });

  it('accepts the shared container name that ffprobe reports for MP4', () => {
    const probe = buildProbe({ container: MP4_FAMILY_CONTAINER });
    expect(() => assertSourceAcceptable(probe, buildLimits())).not.toThrow();
  });

  it('accepts a source with no audio stream', () => {
    const probe = buildProbe({ audioCodec: undefined });
    expect(() => assertSourceAcceptable(probe, buildLimits())).not.toThrow();
  });

  it('rejects an unsupported container', () => {
    const probe = buildProbe({ container: 'matroska,webm' });
    expect(() => assertSourceAcceptable(probe, buildLimits())).toThrow(SourceRejectedError);
  });

  it('rejects an unsupported video codec', () => {
    const probe = buildProbe({ videoCodec: 'vp9' });
    expect(() => assertSourceAcceptable(probe, buildLimits())).toThrow('video codec not supported');
  });

  it('rejects more than one video stream', () => {
    const probe = buildProbe({ videoStreamCount: 2 });
    expect(() => assertSourceAcceptable(probe, buildLimits())).toThrow(
      'expected a single video stream',
    );
  });

  it('rejects a duration above the limit', () => {
    const probe = buildProbe({ durationSeconds: 601 });
    expect(() => assertSourceAcceptable(probe, buildLimits())).toThrow('duration out of range');
  });

  it('rejects a zero duration', () => {
    const probe = buildProbe({ durationSeconds: 0 });
    expect(() => assertSourceAcceptable(probe, buildLimits())).toThrow('duration out of range');
  });

  it('rejects a resolution above the maximum height', () => {
    const probe = buildProbe({ height: 4321 });
    expect(() => assertSourceAcceptable(probe, buildLimits())).toThrow('resolution out of range');
  });

  it('rejects an input larger than the configured maximum', () => {
    const probe = buildProbe({ sizeBytes: 600000000 });
    const limits = buildLimits({ recordedSizeBytes: 600000000 });
    expect(() => assertSourceAcceptable(probe, limits)).toThrow('input too large');
  });

  it('rejects a size that disagrees with the record', () => {
    const probe = buildProbe({ sizeBytes: 604648 });
    const limits = buildLimits({ recordedSizeBytes: 604000 });
    expect(() => assertSourceAcceptable(probe, limits)).toThrow('size does not match record');
  });

  it('never includes a path or a stack trace in the reason', () => {
    const probe = buildProbe({ videoCodec: 'vp9' });
    try {
      assertSourceAcceptable(probe, buildLimits());
      throw new Error('expected a rejection');
    } catch (error) {
      const reason = (error as Error).message;
      expect(reason).not.toContain('/');
      expect(reason).not.toContain('\\');
    }
  });
});
