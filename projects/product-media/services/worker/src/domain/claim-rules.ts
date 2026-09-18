import { MediaStatus } from './media';

const CLAIMABLE_STATUSES: readonly MediaStatus[] = ['QUEUED'];
const MILLISECONDS_PER_SECOND = 1000;

export function canClaim(status: MediaStatus): boolean {
  return CLAIMABLE_STATUSES.includes(status);
}

export function canTakeOver(
  status: MediaStatus,
  updatedAt: Date,
  now: Date,
  abandonedAfterSeconds: number,
): boolean {
  if (status !== 'PROCESSING') {
    return false;
  }
  const idleMilliseconds = now.getTime() - updatedAt.getTime();
  return idleMilliseconds >= abandonedAfterSeconds * MILLISECONDS_PER_SECOND;
}
