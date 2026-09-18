import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadConfiguration } from './config/configuration';
import { TranscodePipeline } from './application/transcode-pipeline';
import { MediaEntity } from './infrastructure/persistence/media.entity';
import { TypeormMediaRepository } from './infrastructure/persistence/typeorm-media-repository';
import { FilesystemStorageGateway } from './infrastructure/storage/filesystem-storage-gateway';
import { LocalScratchWorkspace } from './infrastructure/system/local-scratch-workspace';
import { FfprobeMediaProbe } from './infrastructure/media/ffprobe-media-probe';
import { FfmpegTranscoder } from './infrastructure/media/ffmpeg-transcoder';
import { BullmqJobConsumer } from './infrastructure/queue/bullmq-job-consumer';
import { JsonLogger } from './infrastructure/observability/json-logger';

async function main(): Promise<void> {
  const configuration = loadConfiguration();
  const logger = new JsonLogger(configuration.LOG_LEVEL);

  const dataSource = new DataSource({
    type: 'postgres',
    url: configuration.DATABASE_URL,
    entities: [MediaEntity],
    synchronize: false,
  });
  await dataSource.initialize();

  const jobConsumer = new BullmqJobConsumer({
    redisUrl: configuration.REDIS_URL,
    queueName: configuration.QUEUE_NAME,
    concurrency: configuration.WORKER_CONCURRENCY,
    leaseDurationSeconds: configuration.LEASE_DURATION_SECONDS,
    leaseRenewIntervalSeconds: configuration.LEASE_RENEW_INTERVAL_SECONDS,
  });

  const pipeline = new TranscodePipeline({
    jobConsumer,
    mediaRepository: new TypeormMediaRepository(dataSource),
    storageGateway: new FilesystemStorageGateway(configuration.UPLOADS_DIR),
    scratchWorkspace: new LocalScratchWorkspace(configuration.SCRATCH_DIR),
    mediaProbe: new FfprobeMediaProbe(),
    transcoder: new FfmpegTranscoder(),
    logger,
    settings: {
      maxAttempts: configuration.MAX_ATTEMPTS,
      maxInputBytes: configuration.MAX_INPUT_BYTES,
      maxDurationSeconds: configuration.MAX_DURATION_SECONDS,
      ffmpegPreset: configuration.FFMPEG_PRESET,
      ffmpegThreads: configuration.FFMPEG_THREADS,
      transcodeTimeoutSeconds: configuration.TRANSCODE_TIMEOUT_SECONDS,
      thumbnailTimestamp: configuration.THUMBNAIL_TIMESTAMP,
      abandonedAfterSeconds: configuration.LEASE_DURATION_SECONDS,
    },
  });

  await jobConsumer.subscribe((job) => pipeline.handle(job));
  logger.info('worker ready', {
    queue: configuration.QUEUE_NAME,
    concurrency: configuration.WORKER_CONCURRENCY,
    uploadsRoot: configuration.UPLOADS_DIR,
    scratchRoot: configuration.SCRATCH_DIR,
  });

  const shutdown = async (): Promise<void> => {
    logger.info('shutdown requested');
    await jobConsumer.close();
    await dataSource.destroy();
    logger.info('shutdown complete');
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void main().catch((error: Error) => {
  process.stderr.write(JSON.stringify({ level: 'error', msg: error.message }) + '\n');
  process.exit(1);
});

