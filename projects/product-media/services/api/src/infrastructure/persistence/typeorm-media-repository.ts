import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Media, MediaId } from '../../domain/media';
import { canTransitionTo } from '../../domain/media-status';
import { MediaRepository, StatusTransition } from '../../application/ports/media-repository';
import { MediaEntity } from './media.entity';
import { toDomain, toEntity } from './media-mapper';

@Injectable()
export class TypeormMediaRepository implements MediaRepository {
  constructor(
    @InjectRepository(MediaEntity) private readonly repository: Repository<MediaEntity>,
  ) {}

  async save(media: Media): Promise<void> {
    await this.repository.save(toEntity(media));
  }

  async findById(mediaId: MediaId): Promise<Media | null> {
    const found = await this.repository.findOne({ where: { mediaId } });
    return found === null ? null : toDomain(found);
  }

  async findAll(): Promise<Media[]> {
    const rows = await this.repository.find({ order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  async updateStatus(input: StatusTransition): Promise<boolean> {
    if (!canTransitionTo(input.expectedStatus, input.nextStatus)) {
      return false;
    }
    const result = await this.repository
      .createQueryBuilder()
      .update(MediaEntity)
      .set({
        status: input.nextStatus,
        errorMessage: input.errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where('media_id = :mediaId', { mediaId: input.mediaId })
      .andWhere('status = :expectedStatus', { expectedStatus: input.expectedStatus })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async findExpired(now: Date, limit: number): Promise<Media[]> {
    const rows = await this.repository.find({
      where: { expiresAt: LessThanOrEqual(now) },
      order: { expiresAt: 'ASC' },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async deleteById(mediaId: MediaId): Promise<void> {
    await this.repository.delete({ mediaId });
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.repository.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

