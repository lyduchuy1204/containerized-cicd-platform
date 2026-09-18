import { Inject, Injectable, Logger } from '@nestjs/common';
import { Media } from '../../domain/media';
import { CLOCK, Clock } from '../ports/clock';
import { MEDIA_REPOSITORY, MediaRepository } from '../ports/media-repository';
import { STORAGE_GATEWAY, StorageGateway } from '../ports/storage-gateway';

export interface SweepReport {
  examined: number;
  removed: number;
  failed: number;
}

const SWEEP_BATCH_SIZE = 100;

@Injectable()
export class SweepExpiredMedia {
  private readonly logger = new Logger(SweepExpiredMedia.name);

  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    @Inject(STORAGE_GATEWAY) private readonly storageGateway: StorageGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<SweepReport> {
    const expired = await this.mediaRepository.findExpired(this.clock.now(), SWEEP_BATCH_SIZE);
    let removed = 0;
    let failed = 0;
    for (const media of expired) {
      const wasRemoved = await this.removeQuietly(media);
      if (wasRemoved) {
        removed += 1;
      } else {
        failed += 1;
      }
    }
    return { examined: expired.length, removed, failed };
  }

  private async removeQuietly(media: Media): Promise<boolean> {
    try {
      await this.storageGateway.deleteMedia(media.mediaId);
      await this.mediaRepository.deleteById(media.mediaId);
      return true;
    } catch {
      this.logger.warn({ msg: 'expiry sweep skipped a record', mediaId: media.mediaId });
      return false;
    }
  }
}

