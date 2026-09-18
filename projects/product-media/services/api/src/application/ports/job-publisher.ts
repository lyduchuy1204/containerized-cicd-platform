import { MediaId } from '../../domain/media';

export interface JobPublisher {
  publishTranscodeJob(mediaId: MediaId): Promise<void>;
  isReachable(): Promise<boolean>;
}

export const JOB_PUBLISHER = Symbol('JOB_PUBLISHER');

