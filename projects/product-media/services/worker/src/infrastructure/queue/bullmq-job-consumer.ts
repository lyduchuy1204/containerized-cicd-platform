import { Job, Worker } from 'bullmq';
import { JobConsumer, TranscodeJob } from '../../application/ports/job-consumer';

export interface BullmqConsumerSettings {
  redisUrl: string;
  queueName: string;
  concurrency: number;
  leaseDurationSeconds: number;
  leaseRenewIntervalSeconds: number;
}

const MILLISECONDS_PER_SECOND = 1000;

export class BullmqJobConsumer implements JobConsumer {
  private worker?: Worker;
  private readonly jobs = new Map<string, Job>();

  constructor(private readonly settings: BullmqConsumerSettings) {}

  async subscribe(handler: (job: TranscodeJob) => Promise<void>): Promise<void> {
    this.worker = new Worker(
      this.settings.queueName,
      async (job: Job) => {
        const mediaId = String(job.data.mediaId);
        this.jobs.set(mediaId, job);
        try {
          await handler({ mediaId, attemptCount: job.attemptsMade + 1 });
        } finally {
          this.jobs.delete(mediaId);
        }
      },
      {
        connection: { url: this.settings.redisUrl },
        concurrency: this.settings.concurrency,
        lockDuration: this.settings.leaseDurationSeconds * MILLISECONDS_PER_SECOND,
        lockRenewTime: this.settings.leaseRenewIntervalSeconds * MILLISECONDS_PER_SECOND,
      },
    );
    await this.worker.waitUntilReady();
  }

  async acknowledge(job: TranscodeJob): Promise<void> {
    this.jobs.delete(job.mediaId);
  }

  async release(job: TranscodeJob): Promise<void> {
    const active = this.jobs.get(job.mediaId);
    if (active !== undefined) {
      await active.moveToFailed(new Error('released for retry'), active.token ?? '', false);
    }
  }

  async close(): Promise<void> {
    await this.worker?.close(true);
  }
}
