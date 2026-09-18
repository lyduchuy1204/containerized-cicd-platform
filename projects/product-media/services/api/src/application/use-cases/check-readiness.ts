import { Inject, Injectable } from '@nestjs/common';
import { JOB_PUBLISHER, JobPublisher } from '../ports/job-publisher';
import { MEDIA_REPOSITORY, MediaRepository } from '../ports/media-repository';

export interface ReadinessReport {
  isReady: boolean;
  database: boolean;
  queue: boolean;
}

@Injectable()
export class CheckReadiness {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
    @Inject(JOB_PUBLISHER) private readonly jobPublisher: JobPublisher,
  ) {}

  async execute(): Promise<ReadinessReport> {
    const [database, queue] = await Promise.all([
      this.mediaRepository.isReachable(),
      this.jobPublisher.isReachable(),
    ]);
    return { isReady: database && queue, database, queue };
  }
}

