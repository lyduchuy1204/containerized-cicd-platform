import { isTerminalStatus, Media } from '../types/media';

const FAST_PHASE_POLL_COUNT = 3;
const MEDIUM_PHASE_POLL_COUNT = 6;
const FAST_INTERVAL_MS = 3000;
const MEDIUM_INTERVAL_MS = 5000;
const STEADY_INTERVAL_MS = 10000;

export function resolvePollIntervalMs(pollCount: number): number {
  if (pollCount < FAST_PHASE_POLL_COUNT) {
    return FAST_INTERVAL_MS;
  }
  if (pollCount < MEDIUM_PHASE_POLL_COUNT) {
    return MEDIUM_INTERVAL_MS;
  }
  return STEADY_INTERVAL_MS;
}

export function hasPendingMedia(mediaList: Media[]): boolean {
  return mediaList.some((media) => !isTerminalStatus(media.status));
}
