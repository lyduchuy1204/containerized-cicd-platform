import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { CONFIGURATION, Configuration } from '../../config/configuration';
import { Media } from '../../domain/media';
import { calculateExpiresAt } from '../../domain/expiry';
import { assertAcceptedUpload, assertWithinUploadLimit } from '../../domain/upload-validation';
import { CLOCK, Clock } from '../ports/clock';
import { ID_GENERATOR, IdGenerator } from '../ports/id-generator';
import { JOB_PUBLISHER, JobPublisher } from '../ports/job-publisher';
import { MEDIA_REPOSITORY, MediaRepository } from '../ports/media-repository';
import { STORAGE_GATEWAY, StorageGateway } from '../ports/storage-gateway';

export interface UploadVideoInput {
  filename: string;
  mimetype: string;
  bytes: Readable;
}

@Injectable()
export class UploadVideo {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    @Inject(STORAGE_GATEWAY) private readonly storageGateway: StorageGateway,
    @Inject(JOB_PUBLISHER) private readonly jobPublisher: JobPublisher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
  ) {}

  async execute(input: UploadVideoInput): Promise<Media> {
    assertAcceptedUpload(input.filename, input.mimetype);

    const media = this.createRecord(input.filename);
    await this.mediaRepository.save(media);

    const writtenBytes = await this.storeSource(media, input.bytes);
    const stored: Media = { ...media, sizeBytes: writtenBytes };
    await this.mediaRepository.save(stored);

    await this.mediaRepository.updateStatus({
      mediaId: media.mediaId,
      expectedStatus: 'UPLOADING',
      nextStatus: 'QUEUED',
    });
    await this.jobPublisher.publishTranscodeJob(media.mediaId);

    return { ...stored, status: 'QUEUED' };
  }

  private createRecord(filename: string): Media {
    const createdAt = this.clock.now();
    return {
      mediaId: this.idGenerator.nextMediaId(),
      filename,
      sizeBytes: 0,
      status: 'UPLOADING',
      progress: 0,
      renditions: [],
      createdAt,
      updatedAt: createdAt,
      expiresAt: calculateExpiresAt(createdAt, this.configuration.MEDIA_RETENTION_HOURS),
    };
  }


  private async storeSource(media: Media, bytes: Readable): Promise<number> {
    try {
      const writtenBytes = await this.storageGateway.writeSource(media.mediaId, bytes);
      assertWithinUploadLimit(writtenBytes, this.configuration.MAX_UPLOAD_BYTES);
      return writtenBytes;
    } catch (error) {
      await this.discardFailedUpload(media);
      throw error;
    }
  }

  private async discardFailedUpload(media: Media): Promise<void> {
    await this.storageGateway.deleteMedia(media.mediaId);
    await this.mediaRepository.updateStatus({
      mediaId: media.mediaId,
      expectedStatus: 'UPLOADING',
      nextStatus: 'FAILED',
      errorMessage: 'upload did not complete',
    });
  }
}

