import { MediaStatus } from './media-status';
import { Rendition } from './rendition';

export type MediaId = string;
export type AttemptId = string;

export interface Media {
  mediaId: MediaId;
  filename: string;
  sizeBytes: number;
  status: MediaStatus;
  progress: number;
  sourceWidth?: number;
  sourceHeight?: number;
  durationSeconds?: number;
  renditions: Rendition[];
  thumbnailPath?: string;
  attemptId?: AttemptId;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

