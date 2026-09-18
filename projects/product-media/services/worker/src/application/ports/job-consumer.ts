import { MediaId } from '../../domain/media';

export interface TranscodeJob {
  mediaId: MediaId;
  attemptCount: number;
}

export interface JobConsumer {
  subscribe(handler: (job: TranscodeJob) => Promise<void>): Promise<void>;
  acknowledge(job: TranscodeJob): Promise<void>;
  release(job: TranscodeJob): Promise<void>;
  close(): Promise<void>;
}

