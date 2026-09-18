import { MediaId } from './media';
import { RenditionLabel } from './rendition';

const FILE_ROUTE_PREFIX = '/files';
const THUMBNAIL_FILENAME = 'thumbnail.jpg';

export function resolveDownloadUrl(mediaId: MediaId, filename: string): string {
  return `${FILE_ROUTE_PREFIX}/${mediaId}/${filename}`;
}

export function renditionFilename(label: RenditionLabel): string {
  return `${label}.mp4`;
}

export function thumbnailFilename(): string {
  return THUMBNAIL_FILENAME;
}

