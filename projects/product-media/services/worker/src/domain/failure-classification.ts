import { SourceRejectedError } from './source-acceptance';

export const FAILURE_CLASSES = ['TRANSIENT', 'PERMANENT', 'EXHAUSTED'] as const;

export type FailureClass = (typeof FAILURE_CLASSES)[number];

export interface FailureVerdict {
  failureClass: FailureClass;
  reason: string;
}

const TRANSIENT_REASON = 'processing failed, will be retried';
const EXHAUSTED_REASON = 'processing failed after the final attempt';

export function classifyFailure(
  error: Error,
  attemptCount: number,
  maxAttempts: number,
): FailureVerdict {
  if (error instanceof SourceRejectedError) {
    return { failureClass: 'PERMANENT', reason: error.message };
  }
  if (attemptCount >= maxAttempts) {
    return { failureClass: 'EXHAUSTED', reason: EXHAUSTED_REASON };
  }
  return { failureClass: 'TRANSIENT', reason: TRANSIENT_REASON };
}

