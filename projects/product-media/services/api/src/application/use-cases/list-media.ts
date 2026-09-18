import { Inject, Injectable } from '@nestjs/common';
import { Media } from '../../domain/media';
import { isExpired } from '../../domain/expiry';
import { CLOCK, Clock } from '../ports/clock';
import { MEDIA_REPOSITORY, MediaRepository } from '../ports/media-repository';

@Injectable()
export class ListMedia {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<Media[]> {
    const now = this.clock.now();
    const mediaList = await this.mediaRepository.findAll();
    return mediaList.filter((media) => !isExpired(media, now));
  }
}

