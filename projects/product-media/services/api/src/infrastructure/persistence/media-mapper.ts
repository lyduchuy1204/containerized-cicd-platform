import { Media } from '../../domain/media';
import { MediaEntity } from './media.entity';

export function toDomain(entity: MediaEntity): Media {
  return {
    mediaId: entity.mediaId,
    filename: entity.filename,
    sizeBytes: Number(entity.sizeBytes),
    status: entity.status,
    progress: entity.progress,
    sourceWidth: entity.sourceWidth ?? undefined,
    sourceHeight: entity.sourceHeight ?? undefined,
    durationSeconds: entity.durationSeconds ?? undefined,
    renditions: entity.renditions ?? [],
    thumbnailPath: entity.thumbnailPath ?? undefined,
    attemptId: entity.attemptId ?? undefined,
    errorMessage: entity.errorMessage ?? undefined,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    expiresAt: entity.expiresAt,
  };
}

export function toEntity(media: Media): MediaEntity {
  const entity = new MediaEntity();
  entity.mediaId = media.mediaId;
  entity.filename = media.filename;
  entity.sizeBytes = String(media.sizeBytes);
  entity.status = media.status;
  entity.progress = media.progress;
  entity.sourceWidth = media.sourceWidth ?? null;
  entity.sourceHeight = media.sourceHeight ?? null;
  entity.durationSeconds = media.durationSeconds ?? null;
  entity.renditions = media.renditions;
  entity.thumbnailPath = media.thumbnailPath ?? null;
  entity.attemptId = media.attemptId ?? null;
  entity.errorMessage = media.errorMessage ?? null;
  entity.createdAt = media.createdAt;
  entity.updatedAt = media.updatedAt;
  entity.expiresAt = media.expiresAt;
  return entity;
}

