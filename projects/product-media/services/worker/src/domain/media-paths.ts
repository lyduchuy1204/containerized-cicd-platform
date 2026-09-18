import { MediaId } from './media';

const ORIGINALS_BRANCH = 'originals';
const PROCESSED_BRANCH = 'processed';
const SOURCE_FILENAME = 'source.mp4';
const THUMBNAIL_FILENAME = 'thumbnail.jpg';

export function sourceObjectPath(mediaId: MediaId): string {
  return `${ORIGINALS_BRANCH}/${mediaId}/${SOURCE_FILENAME}`;
}

export function processedObjectPath(mediaId: MediaId, filename: string): string {
  return `${PROCESSED_BRANCH}/${mediaId}/${filename}`;
}

export function sourceFilename(): string {
  return SOURCE_FILENAME;
}

export function thumbnailFilename(): string {
  return THUMBNAIL_FILENAME;
}

