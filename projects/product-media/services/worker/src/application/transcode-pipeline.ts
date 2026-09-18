import { randomUUID } from 'crypto';
import { AttemptId, MediaId } from '../domain/media';
import { canClaim, canTakeOver } from '../domain/claim-rules';
import { classifyFailure } from '../domain/failure-classification';
import { sourceFilename, thumbnailFilename } from '../domain/media-paths';
import { AcceptanceLimits } from '../domain/probe-result';
import { RenditionOutput } from '../domain/rendition-target';
import { assertSourceAcceptable } from '../domain/source-acceptance';
import { buildOutputFilename, resolveRenditionSet } from '../domain/rendition-ladder';
import { JobConsumer, TranscodeJob } from './ports/job-consumer';
import { Logger } from './ports/logger';
import { MediaProbe } from './ports/media-probe';
import { MediaRepository } from './ports/media-repository';
import { ScratchWorkspace } from './ports/scratch-workspace';
import { StorageGateway } from './ports/storage-gateway';
import { Transcoder } from './ports/transcoder';

export interface PipelineSettings {
  maxAttempts: number;
  maxInputBytes: number;
  maxDurationSeconds: number;
  ffmpegPreset: string;
  ffmpegThreads: number;
  transcodeTimeoutSeconds: number;
  thumbnailTimestamp: string;
  abandonedAfterSeconds: number;
}

export interface PipelineDependencies {
  jobConsumer: JobConsumer;
  mediaRepository: MediaRepository;
  storageGateway: StorageGateway;
  scratchWorkspace: ScratchWorkspace;
  mediaProbe: MediaProbe;
  transcoder: Transcoder;
  logger: Logger;
  settings: PipelineSettings;
}

export class TranscodePipeline {
  constructor(private readonly dependencies: PipelineDependencies) {}

  async handle(job: TranscodeJob): Promise<void> {
    const attemptId = randomUUID();
    const startedAtMillis = Date.now();
    this.dependencies.logger.info('job received', {
      mediaId: job.mediaId,
      attemptId,
      attemptCount: job.attemptCount,
    });
    const claimed = await this.claimJob(job.mediaId, attemptId);
    if (!claimed) {
      this.dependencies.logger.info('job skipped', {
        mediaId: job.mediaId,
        attemptId,
        reason: 'media not claimable',
      });
      await this.dependencies.jobConsumer.acknowledge(job);
      return;
    }
    try {
      await this.runStages(job.mediaId, attemptId);
      await this.dependencies.jobConsumer.acknowledge(job);
      this.dependencies.logger.info('job completed', {
        mediaId: job.mediaId,
        attemptId,
        elapsedMillis: Date.now() - startedAtMillis,
      });
    } catch (error) {
      await this.handleFailure(job, attemptId, error as Error);
    } finally {
      await this.dependencies.scratchWorkspace.discard(attemptId);
    }
  }

  private async claimJob(mediaId: MediaId, attemptId: AttemptId): Promise<boolean> {
    const media = await this.dependencies.mediaRepository.findById(mediaId);
    if (media === null) {
      return false;
    }
    const abandonedAfterSeconds = this.dependencies.settings.abandonedAfterSeconds;
    const isFresh = canClaim(media.status);
    const isAbandoned = canTakeOver(media.status, media.updatedAt, new Date(), abandonedAfterSeconds);
    if (!isFresh && !isAbandoned) {
      return false;
    }
    if (isAbandoned) {
      this.dependencies.logger.warn('taking over an abandoned attempt', {
        mediaId,
        attemptId,
        previousAttemptId: media.attemptId ?? 'none',
        idleSeconds: Math.round((Date.now() - media.updatedAt.getTime()) / 1000),
      });
    }
    return this.dependencies.mediaRepository.claim({ mediaId, attemptId, abandonedAfterSeconds });
  }

  private async runStages(mediaId: MediaId, attemptId: AttemptId): Promise<void> {
    const media = await this.dependencies.mediaRepository.findById(mediaId);
    if (media === null) {
      return;
    }
    await this.dependencies.scratchWorkspace.create(attemptId);
    const localSource = this.dependencies.scratchWorkspace.pathFor(attemptId, sourceFilename());
    await this.dependencies.storageGateway.readSource(mediaId, localSource);

    const probe = await this.dependencies.mediaProbe.inspect(localSource);
    assertSourceAcceptable(probe, this.buildLimits(media.sizeBytes));
    await this.dependencies.mediaRepository.recordProbe({ mediaId, attemptId, probe });
    this.dependencies.logger.info('source accepted', {
      mediaId,
      attemptId,
      sourceWidth: probe.width,
      sourceHeight: probe.height,
      durationSeconds: probe.durationSeconds,
    });

    const outputs = await this.renderAll(mediaId, attemptId, localSource, probe.width, probe.height);
    const thumbnail = await this.renderThumbnail(mediaId, attemptId, localSource);

    const wasApplied = await this.dependencies.mediaRepository.completeWith({
      mediaId,
      attemptId,
      renditions: outputs,
      thumbnailPath: thumbnail,
    });
    if (!wasApplied) {
      this.dependencies.logger.info('completion rejected', {
        mediaId,
        attemptId,
        reason: 'record no longer owned by this attempt',
      });
    }
  }

  private async renderAll(
    mediaId: MediaId,
    attemptId: AttemptId,
    localSource: string,
    sourceWidth: number,
    sourceHeight: number,
  ): Promise<RenditionOutput[]> {
    const targets = resolveRenditionSet(sourceWidth, sourceHeight);
    const outputs: RenditionOutput[] = [];
    let completed = 0;
    for (const target of targets) {
      const filename = buildOutputFilename(target.label);
      const destination = this.dependencies.scratchWorkspace.pathFor(attemptId, filename);
      const rendered = await this.dependencies.transcoder.renderRendition({
        sourcePath: localSource,
        destinationPath: destination,
        target,
        preset: this.dependencies.settings.ffmpegPreset,
        threads: this.dependencies.settings.ffmpegThreads,
        timeoutSeconds: this.dependencies.settings.transcodeTimeoutSeconds,
      });
      const storedPath = await this.dependencies.storageGateway.writeOutput(mediaId, destination, filename);
      outputs.push({ ...rendered, path: storedPath });
      completed += 1;
      const progress = Math.round((completed / (targets.length + 1)) * 100);
      await this.dependencies.mediaRepository.updateProgress({ mediaId, attemptId, progress });
      this.dependencies.logger.info('rendition written', {
        mediaId,
        attemptId,
        renditionLabel: target.label,
        sizeBytes: rendered.sizeBytes,
        progress,
      });
    }
    return outputs;
  }

  private async renderThumbnail(
    mediaId: MediaId,
    attemptId: AttemptId,
    localSource: string,
  ): Promise<string> {
    const filename = thumbnailFilename();
    const destination = this.dependencies.scratchWorkspace.pathFor(attemptId, filename);
    await this.dependencies.transcoder.renderThumbnail({
      sourcePath: localSource,
      destinationPath: destination,
      timestamp: this.dependencies.settings.thumbnailTimestamp,
      timeoutSeconds: this.dependencies.settings.transcodeTimeoutSeconds,
    });
    return this.dependencies.storageGateway.writeOutput(mediaId, destination, filename);
  }

  private buildLimits(recordedSizeBytes: number): AcceptanceLimits {
    return {
      maxInputBytes: this.dependencies.settings.maxInputBytes,
      maxDurationSeconds: this.dependencies.settings.maxDurationSeconds,
      recordedSizeBytes,
    };
  }

  private async handleFailure(job: TranscodeJob, attemptId: AttemptId, error: Error): Promise<void> {
    const verdict = classifyFailure(error, job.attemptCount, this.dependencies.settings.maxAttempts);
    this.dependencies.logger.error('attempt failed', {
      mediaId: job.mediaId,
      attemptId,
      attemptCount: job.attemptCount,
      failureClass: verdict.failureClass,
      reason: verdict.reason,
    });
    if (verdict.failureClass === 'TRANSIENT') {
      await this.dependencies.jobConsumer.release(job);
      return;
    }
    const wasApplied = await this.dependencies.mediaRepository.failWith({
      mediaId: job.mediaId,
      attemptId,
      reason: verdict.reason,
    });
    if (!wasApplied) {
      this.dependencies.logger.info('failure record rejected', {
        mediaId: job.mediaId,
        attemptId,
        reason: 'record no longer owned by this attempt',
      });
    }
    await this.dependencies.jobConsumer.acknowledge(job);
  }
}

