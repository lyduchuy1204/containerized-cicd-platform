export const MEDIA_STATUSES = ['UPLOADING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

export type MediaStatus = (typeof MEDIA_STATUSES)[number];

const ALLOWED_TRANSITIONS: Readonly<Record<MediaStatus, readonly MediaStatus[]>> = {
  UPLOADING: ['QUEUED', 'FAILED'],
  QUEUED: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'FAILED', 'QUEUED'],
  COMPLETED: [],
  FAILED: [],
};

export function canTransitionTo(from: MediaStatus, to: MediaStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: MediaStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

const AWAITING_PROCESSING_STATUSES: readonly MediaStatus[] = [
  'UPLOADING',
  'QUEUED',
  'PROCESSING',
];

export function isAwaitingProcessing(status: MediaStatus): boolean {
  return AWAITING_PROCESSING_STATUSES.includes(status);
}

