import { AttemptId, Media, MediaId } from '../../domain/media';
import { ProbeResult } from '../../domain/probe-result';
import { RenditionOutput } from '../../domain/rendition-target';

export interface ClaimInput {
  mediaId: MediaId;
  attemptId: AttemptId;
  abandonedAfterSeconds: number;
}

export interface ProbeRecordInput {
  mediaId: MediaId;
  attemptId: AttemptId;
  probe: ProbeResult;
}

export interface ProgressInput {
  mediaId: MediaId;
  attemptId: AttemptId;
  progress: number;
}

export interface CompletionInput {
  mediaId: MediaId;
  attemptId: AttemptId;
  renditions: RenditionOutput[];
  thumbnailPath: string;
}

export interface FailureInput {
  mediaId: MediaId;
  attemptId: AttemptId;
  reason: string;
}

export interface MediaRepository {
  findById(mediaId: MediaId): Promise<Media | null>;
  claim(input: ClaimInput): Promise<boolean>;
  recordProbe(input: ProbeRecordInput): Promise<boolean>;
  updateProgress(input: ProgressInput): Promise<void>;
  completeWith(input: CompletionInput): Promise<boolean>;
  failWith(input: FailureInput): Promise<boolean>;
}

