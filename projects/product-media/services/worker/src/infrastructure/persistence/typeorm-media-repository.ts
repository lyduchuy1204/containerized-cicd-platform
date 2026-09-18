import { DataSource, Repository } from 'typeorm';
import { Media, MediaId } from '../../domain/media';
import {
  ClaimInput,
  CompletionInput,
  FailureInput,
  MediaRepository,
  ProbeRecordInput,
  ProgressInput,
} from '../../application/ports/media-repository';
import { MediaEntity } from './media.entity';

export class TypeormMediaRepository implements MediaRepository {
  private readonly repository: Repository<MediaEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(MediaEntity);
  }

  async findById(mediaId: MediaId): Promise<Media | null> {
    const row = await this.repository.findOne({ where: { mediaId } });
    if (row === null) {
      return null;
    }
    return {
      mediaId: row.mediaId,
      filename: row.filename,
      sizeBytes: Number(row.sizeBytes),
      status: row.status,
      progress: row.progress,
      sourceWidth: row.sourceWidth ?? undefined,
      sourceHeight: row.sourceHeight ?? undefined,
      durationSeconds: row.durationSeconds ?? undefined,
      renditions: row.renditions ?? [],
      thumbnailPath: row.thumbnailPath ?? undefined,
      attemptId: row.attemptId ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt,
    };
  }

  async claim(input: ClaimInput): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(MediaEntity)
      .set({ status: 'PROCESSING', attemptId: input.attemptId, progress: 0, updatedAt: new Date() })
      .where('media_id = :mediaId', { mediaId: input.mediaId })
      .andWhere(
        "(status = 'QUEUED' OR (status = 'PROCESSING' AND updated_at < NOW() - make_interval(secs => :abandonedAfterSeconds)))",
        { abandonedAfterSeconds: input.abandonedAfterSeconds },
      )
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async recordProbe(input: ProbeRecordInput): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(MediaEntity)
      .set({
        sourceWidth: input.probe.width,
        sourceHeight: input.probe.height,
        durationSeconds: input.probe.durationSeconds,
        updatedAt: new Date(),
      })
      .where('media_id = :mediaId', { mediaId: input.mediaId })
      .andWhere('attempt_id = :attemptId', { attemptId: input.attemptId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async updateProgress(input: ProgressInput): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(MediaEntity)
      .set({ progress: input.progress, updatedAt: new Date() })
      .where('media_id = :mediaId', { mediaId: input.mediaId })
      .andWhere('attempt_id = :attemptId', { attemptId: input.attemptId })
      .execute();
  }

  async completeWith(input: CompletionInput): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(MediaEntity)
      .set({
        status: 'COMPLETED',
        progress: 100,
        renditions: input.renditions,
        thumbnailPath: input.thumbnailPath,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where('media_id = :mediaId', { mediaId: input.mediaId })
      .andWhere('attempt_id = :attemptId', { attemptId: input.attemptId })
      .andWhere('status = :expected', { expected: 'PROCESSING' })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async failWith(input: FailureInput): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(MediaEntity)
      .set({ status: 'FAILED', errorMessage: input.reason, updatedAt: new Date() })
      .where('media_id = :mediaId', { mediaId: input.mediaId })
      .andWhere('attempt_id = :attemptId', { attemptId: input.attemptId })
      .andWhere('status = :expected', { expected: 'PROCESSING' })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}

