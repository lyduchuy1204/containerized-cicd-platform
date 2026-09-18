import * as path from 'path';
import { mediaNotFound } from './media-error';

export function assertPathInsideRoot(uploadsRoot: string, candidate: string): void {
  const resolvedRoot = path.resolve(uploadsRoot);
  const resolvedCandidate = path.resolve(uploadsRoot, candidate);
  const isInside =
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
  if (!isInside) {
    throw mediaNotFound();
  }
}

export function assertSafeFilename(filename: string): void {
  const hasSeparator = filename.includes('/') || filename.includes('\\');
  const isRelativeReference = filename === '.' || filename === '..';
  if (filename.length === 0 || hasSeparator || isRelativeReference) {
    throw mediaNotFound();
  }
}

