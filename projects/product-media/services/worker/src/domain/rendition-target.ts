import { RenditionLabel } from './media';

export interface RenditionTarget {
  label: RenditionLabel;
  width: number;
  height: number;
}

export interface RenditionOutput {
  label: RenditionLabel;
  width: number;
  height: number;
  sizeBytes: number;
  path: string;
}

export { RenditionLabel };

