import { MediaId } from './media';

const ORIGINALS_BRANCH = 'originals';
const PROCESSED_BRANCH = 'processed';
const SOURCE_FILENAME = 'source.mp4';

export function originalsDirectory(mediaId: MediaId): string {
  return `${ORIGINALS_BRANCH}/${mediaId}`;
}

export function processedDirectory(mediaId: MediaId): string {
  return `${PROCESSED_BRANCH}/${mediaId}`;
}

export function sourceObjectPath(mediaId: MediaId): string {
  return `${ORIGINALS_BRANCH}/${mediaId}/${SOURCE_FILENAME}`;
}

export function processedObjectPath(mediaId: MediaId, filename: string): string {
  return `${PROCESSED_BRANCH}/${mediaId}/${filename}`;
}

export function isSourceFilename(filename: string): boolean {
  return filename === SOURCE_FILENAME;
}

