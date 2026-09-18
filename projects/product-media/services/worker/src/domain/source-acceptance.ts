import { AcceptanceLimits, ProbeResult } from './probe-result';

export class SourceRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'SourceRejectedError';
  }
}

const ACCEPTED_CONTAINERS = ['mp4', 'mov,mp4,m4a,3gp,3g2,mj2', 'isom'];
const ACCEPTED_VIDEO_CODECS = ['h264', 'hevc'];
const ACCEPTED_AUDIO_CODECS = ['aac', 'mp3'];
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 4320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 8192;

export function assertSourceAcceptable(probe: ProbeResult, limits: AcceptanceLimits): void {
  if (!ACCEPTED_CONTAINERS.includes(probe.container.toLowerCase())) {
    throw new SourceRejectedError('container not supported');
  }
  if (!ACCEPTED_VIDEO_CODECS.includes(probe.videoCodec.toLowerCase())) {
    throw new SourceRejectedError('video codec not supported');
  }
  if (probe.audioCodec !== undefined && !ACCEPTED_AUDIO_CODECS.includes(probe.audioCodec.toLowerCase())) {
    throw new SourceRejectedError('audio codec not supported');
  }
  if (probe.videoStreamCount !== 1) {
    throw new SourceRejectedError('expected a single video stream');
  }
  if (probe.durationSeconds <= 0 || probe.durationSeconds > limits.maxDurationSeconds) {
    throw new SourceRejectedError('duration out of range');
  }
  if (probe.height < MIN_HEIGHT || probe.height > MAX_HEIGHT) {
    throw new SourceRejectedError('resolution out of range');
  }
  if (probe.width < MIN_WIDTH || probe.width > MAX_WIDTH) {
    throw new SourceRejectedError('resolution out of range');
  }
  if (probe.sizeBytes > limits.maxInputBytes) {
    throw new SourceRejectedError('input too large');
  }
  if (probe.sizeBytes !== limits.recordedSizeBytes) {
    throw new SourceRejectedError('size does not match record');
  }
}

