export type MediaStatus = 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type RenditionLabel = '2k' | '1080p' | '720p' | '480p';

export interface Rendition {
  label: RenditionLabel;
  width: number;
  height: number;
  sizeBytes: number;
  url: string;
}

export interface Media {
  id: string;
  filename: string;
  sizeBytes: number;
  status: MediaStatus;
  progress: number;
  sourceWidth?: number;
  sourceHeight?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  renditions: Rendition[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const TERMINAL_STATUSES: readonly MediaStatus[] = ['COMPLETED', 'FAILED'];

export function isTerminalStatus(status: MediaStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
