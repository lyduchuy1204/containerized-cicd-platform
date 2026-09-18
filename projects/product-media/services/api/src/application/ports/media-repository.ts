import { Media, MediaId } from '../../domain/media';
import { MediaStatus } from '../../domain/media-status';

export interface StatusTransition {
  mediaId: MediaId;
  expectedStatus: MediaStatus;
  nextStatus: MediaStatus;
  errorMessage?: string;
}

export interface MediaRepository {
  save(media: Media): Promise<void>;
  findById(mediaId: MediaId): Promise<Media | null>;
  findAll(): Promise<Media[]>;
  updateStatus(input: StatusTransition): Promise<boolean>;
  findExpired(now: Date, limit: number): Promise<Media[]>;
  deleteById(mediaId: MediaId): Promise<void>;
  isReachable(): Promise<boolean>;
}

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

