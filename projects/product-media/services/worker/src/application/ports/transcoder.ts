import { RenditionOutput, RenditionTarget } from '../../domain/rendition-target';

export interface RenderRenditionInput {
  sourcePath: string;
  destinationPath: string;
  target: RenditionTarget;
  preset: string;
  threads: number;
  timeoutSeconds: number;
}

export interface RenderThumbnailInput {
  sourcePath: string;
  destinationPath: string;
  timestamp: string;
  timeoutSeconds: number;
}

export interface Transcoder {
  renderRendition(input: RenderRenditionInput): Promise<RenditionOutput>;
  renderThumbnail(input: RenderThumbnailInput): Promise<string>;
}

