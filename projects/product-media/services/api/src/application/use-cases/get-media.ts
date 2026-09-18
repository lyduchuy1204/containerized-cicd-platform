import { Inject, Injectable } from '@nestjs/common';
import { Media, MediaId } from '../../domain/media';
import { isExpired } from '../../domain/expiry';
import { mediaExpired, mediaNotFound } from '../../domain/media-error';
import { CLOCK, Clock } from '../ports/clock';
import { MEDIA_REPOSITORY, MediaRepository } from '../ports/media-repository';

@Injectable()
export class GetMedia {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(mediaId: MediaId): Promise<Media> {
    const media = await this.mediaRepository.findById(mediaId);
    if (media === null) {
      throw mediaNotFound();
    }
    if (isExpired(media, this.clock.now())) {
      throw mediaExpired();
    }
    return media;
  }
}

