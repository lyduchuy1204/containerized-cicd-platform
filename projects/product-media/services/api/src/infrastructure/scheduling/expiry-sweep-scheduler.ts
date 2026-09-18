import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CONFIGURATION, Configuration } from '../../config/configuration';
import { SweepExpiredMedia } from '../../application/use-cases/sweep-expired-media';

const MILLISECONDS_PER_MINUTE = 60000;

@Injectable()
export class ExpirySweepScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpirySweepScheduler.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
    private readonly sweepExpiredMedia: SweepExpiredMedia,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.configuration.EXPIRY_SWEEP_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE;
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
    }
  }

  private async runOnce(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      const report = await this.sweepExpiredMedia.execute();
      if (report.examined > 0) {
        this.logger.log({ msg: 'expiry sweep completed', ...report });
      }
    } catch {
      this.logger.warn({ msg: 'expiry sweep did not complete' });
    } finally {
      this.isRunning = false;
    }
  }
}

