import { AttemptId } from '../../domain/media';

export interface ScratchWorkspace {
  create(attemptId: AttemptId): Promise<string>;
  pathFor(attemptId: AttemptId, filename: string): string;
  discard(attemptId: AttemptId): Promise<void>;
}

