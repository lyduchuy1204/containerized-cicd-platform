import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { MediaId } from '../../domain/media';
import { isExpired } from '../../domain/expiry';
import { mediaExpired, mediaNotFound, mediaNotReady } from '../../domain/media-error';
import { isAwaitingProcessing } from '../../domain/media-status';
import { isSourceFilename, processedObjectPath, sourceObjectPath } from '../../domain/media-paths';
import { assertSafeFilename } from '../../domain/path-safety';
import { CLOCK, Clock } from '../ports/clock';
import { MEDIA_REPOSITORY, MediaRepository } from '../ports/media-repository';
import { ByteRange, STORAGE_GATEWAY, StorageGateway } from '../ports/storage-gateway';

export interface ReadMediaFileInput {
  mediaId: MediaId;
  filename: string;
  range?: ByteRange;
}

export interface MediaFileStream {
  stream: Readable;
  sizeBytes: number;
  contentType: string;
}

const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
};

@Injectable()
export class ReadMediaFile {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    @Inject(STORAGE_GATEWAY) private readonly storageGateway: StorageGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: ReadMediaFileInput): Promise<MediaFileStream> {
    assertSafeFilename(input.filename);
    const media = await this.mediaRepository.findById(input.mediaId);
    if (media === null) {
      throw mediaNotFound();
    }
    if (isExpired(media, this.clock.now())) {
      throw mediaExpired();
    }
    const isProcessedOutput = !isSourceFilename(input.filename);
    if (isProcessedOutput && isAwaitingProcessing(media.status)) {
      throw mediaNotReady();
    }
    const objectPath = this.resolveObjectPath(input.mediaId, input.filename);
    const fileStat = await this.storageGateway.stat(objectPath);
    if (fileStat === null) {
      throw mediaNotFound();
    }
    return {
      stream: await this.storageGateway.openRead(objectPath, input.range),
      sizeBytes: fileStat.sizeBytes,
      contentType: this.resolveContentType(input.filename),
    };
  }

  private resolveObjectPath(mediaId: string, filename: string): string {
    return isSourceFilename(filename)
      ? sourceObjectPath(mediaId)
      : processedObjectPath(mediaId, filename);
  }

  private resolveContentType(filename: string): string {
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
    if (contentType === undefined) {
      throw mediaNotFound();
    }
    return contentType;
  }
}

