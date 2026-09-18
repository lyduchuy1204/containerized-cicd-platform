import { Media } from './media';

const MILLISECONDS_PER_HOUR = 3600000;

export function calculateExpiresAt(createdAt: Date, retentionHours: number): Date {
  return new Date(createdAt.getTime() + retentionHours * MILLISECONDS_PER_HOUR);
}

export function isExpired(media: Media, now: Date): boolean {
  return media.expiresAt.getTime() <= now.getTime();
}

