export const RENDITION_LABELS = ['2k', '1080p', '720p', '480p'] as const;

export type RenditionLabel = (typeof RENDITION_LABELS)[number];

export interface Rendition {
  label: RenditionLabel;
  width: number;
  height: number;
  sizeBytes: number;
  path: string;
}

