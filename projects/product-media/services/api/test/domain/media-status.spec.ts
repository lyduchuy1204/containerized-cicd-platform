import {
  canTransitionTo,
  isAwaitingProcessing,
  isTerminalStatus,
  MEDIA_STATUSES,
} from '../../src/domain/media-status';

describe('canTransitionTo', () => {
  it('allows the successful path from upload to completion', () => {
    expect(canTransitionTo('UPLOADING', 'QUEUED')).toBe(true);
    expect(canTransitionTo('QUEUED', 'PROCESSING')).toBe(true);
    expect(canTransitionTo('PROCESSING', 'COMPLETED')).toBe(true);
  });

  it('allows a processing item to be returned to the queue for retry', () => {
    expect(canTransitionTo('PROCESSING', 'QUEUED')).toBe(true);
  });

  it('refuses to move out of a terminal status', () => {
    for (const status of MEDIA_STATUSES) {
      expect(canTransitionTo('COMPLETED', status)).toBe(false);
      expect(canTransitionTo('FAILED', status)).toBe(false);
    }
  });

  it('refuses to skip the queue', () => {
    expect(canTransitionTo('UPLOADING', 'PROCESSING')).toBe(false);
    expect(canTransitionTo('UPLOADING', 'COMPLETED')).toBe(false);
  });

  it('refuses to fail a queued item directly', () => {
    expect(canTransitionTo('QUEUED', 'FAILED')).toBe(false);
  });
});

describe('isTerminalStatus', () => {
  it('treats completed and failed as terminal', () => {
    expect(isTerminalStatus('COMPLETED')).toBe(true);
    expect(isTerminalStatus('FAILED')).toBe(true);
  });

  it.each(['UPLOADING', 'QUEUED', 'PROCESSING'] as const)('treats %s as not terminal', (status) => {
    expect(isTerminalStatus(status)).toBe(false);
  });
});

describe('isAwaitingProcessing', () => {
  it.each(['UPLOADING', 'QUEUED', 'PROCESSING'] as const)('reports %s as awaiting', (status) => {
    expect(isAwaitingProcessing(status)).toBe(true);
  });

  it('reports completed as not awaiting, so outputs may be served', () => {
    expect(isAwaitingProcessing('COMPLETED')).toBe(false);
  });

  it('reports failed as not awaiting, so a missing output reads as not found', () => {
    expect(isAwaitingProcessing('FAILED')).toBe(false);
  });
});
