export type MediaId = string;
export type AttemptId = string;

export const MEDIA_STATUSES = ['UPLOADING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const RENDITION_LABELS = ['2k', '1080p', '720p', '480p'] as const;

export type RenditionLabel = (typeof RENDITION_LABELS)[number];

export interface Rendition {
  label: RenditionLabel;
  width: number;
  height: number;
  sizeBytes: number;
  path: string;
}

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

