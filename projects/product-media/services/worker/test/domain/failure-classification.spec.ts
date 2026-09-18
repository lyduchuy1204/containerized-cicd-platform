import { canClaim, canTakeOver } from '../../src/domain/claim-rules';
import { classifyFailure } from '../../src/domain/failure-classification';
import { SourceRejectedError } from '../../src/domain/source-acceptance';

const MAX_ATTEMPTS = 3;

describe('classifyFailure', () => {
  it('treats a rejected source as permanent on the first attempt', () => {
    const verdict = classifyFailure(new SourceRejectedError('duration out of range'), 1, MAX_ATTEMPTS);
    expect(verdict.failureClass).toBe('PERMANENT');
    expect(verdict.reason).toBe('duration out of range');
  });

  it('keeps a rejected source permanent even on the final attempt', () => {
    const verdict = classifyFailure(new SourceRejectedError('input too large'), 3, MAX_ATTEMPTS);
    expect(verdict.failureClass).toBe('PERMANENT');
  });

  it('treats an unexpected error as transient while attempts remain', () => {
    const verdict = classifyFailure(new Error('connection reset'), 1, MAX_ATTEMPTS);
    expect(verdict.failureClass).toBe('TRANSIENT');
  });

  it('treats the final attempt as exhausted', () => {
    const verdict = classifyFailure(new Error('connection reset'), 3, MAX_ATTEMPTS);
    expect(verdict.failureClass).toBe('EXHAUSTED');
  });

  it('treats an attempt beyond the maximum as exhausted', () => {
    const verdict = classifyFailure(new Error('connection reset'), 4, MAX_ATTEMPTS);
    expect(verdict.failureClass).toBe('EXHAUSTED');
  });

  it('does not leak an underlying stack trace into the reason', () => {
    const verdict = classifyFailure(new Error('ENOENT /uploads/originals/x/source.mp4'), 1, MAX_ATTEMPTS);
    expect(verdict.reason).not.toContain('/uploads');
  });
});

describe('canClaim', () => {
  it('allows claiming a queued item', () => {
    expect(canClaim('QUEUED')).toBe(true);
  });

  it.each(['UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const)(
    'refuses to claim a %s item',
    (status) => {
      expect(canClaim(status)).toBe(false);
    },
  );
});

describe('canTakeOver', () => {
  const now = new Date('2026-09-01T12:00:00.000Z');
  const abandonedAfterSeconds = 120;

  it('takes over a processing item whose owner stopped reporting', () => {
    const updatedAt = new Date('2026-09-01T11:57:00.000Z');
    expect(canTakeOver('PROCESSING', updatedAt, now, abandonedAfterSeconds)).toBe(true);
  });

  it('takes over exactly at the threshold', () => {
    const updatedAt = new Date('2026-09-01T11:58:00.000Z');
    expect(canTakeOver('PROCESSING', updatedAt, now, abandonedAfterSeconds)).toBe(true);
  });

  it('leaves a processing item alone while its owner is still reporting', () => {
    const updatedAt = new Date('2026-09-01T11:59:30.000Z');
    expect(canTakeOver('PROCESSING', updatedAt, now, abandonedAfterSeconds)).toBe(false);
  });

  it.each(['QUEUED', 'UPLOADING', 'COMPLETED', 'FAILED'] as const)(
    'never takes over a %s item, however old',
    (status) => {
      const updatedAt = new Date('2020-01-01T00:00:00.000Z');
      expect(canTakeOver(status, updatedAt, now, abandonedAfterSeconds)).toBe(false);
    },
  );
});
