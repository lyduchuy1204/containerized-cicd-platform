import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CONFIGURATION, Configuration } from '../../config/configuration';
import { MediaId } from '../../domain/media';
import { JobPublisher } from '../../application/ports/job-publisher';

const TRANSCODE_JOB_NAME = 'transcode';

@Injectable()
export class BullmqJobPublisher implements JobPublisher, OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@Inject(CONFIGURATION) configuration: Configuration) {
    this.queue = new Queue(configuration.QUEUE_NAME, {
      connection: { url: configuration.REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  async publishTranscodeJob(mediaId: MediaId): Promise<void> {
    await this.queue.add(TRANSCODE_JOB_NAME, { mediaId }, { jobId: mediaId });
  }

  async isReachable(): Promise<boolean> {
    try {
      const client = await this.queue.client;
      const reply = await client.ping();
      return reply === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

