import { Media } from '../../domain/media';
import { renditionFilename, resolveDownloadUrl, thumbnailFilename } from '../../domain/download-url';
import { MediaStatusType, MediaType } from './media.type';

export function presentMedia(media: Media): MediaType {
  return {
    id: media.mediaId,
    filename: media.filename,
    sizeBytes: media.sizeBytes,
    status: media.status as MediaStatusType,
    progress: media.progress,
    sourceWidth: media.sourceWidth,
    sourceHeight: media.sourceHeight,
    durationSeconds: media.durationSeconds,
    thumbnailUrl:
      media.thumbnailPath === undefined
        ? undefined
        : resolveDownloadUrl(media.mediaId, thumbnailFilename()),
    renditions: media.renditions.map((rendition) => ({
      label: rendition.label,
      width: rendition.width,
      height: rendition.height,
      sizeBytes: rendition.sizeBytes,
      url: resolveDownloadUrl(media.mediaId, renditionFilename(rendition.label)),
    })),
    errorMessage: media.errorMessage,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}

