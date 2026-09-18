import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { MediaStatus } from '../../domain/media-status';
import { Rendition } from '../../domain/rendition';

@Entity({ name: 'media' })
export class MediaEntity {
  @PrimaryColumn({ name: 'media_id', type: 'uuid' })
  mediaId: string;

  @Column({ name: 'filename', type: 'text' })
  filename: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Index('idx_media_status')
  @Column({ name: 'status', type: 'varchar', length: 16 })
  status: MediaStatus;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'source_width', type: 'int', nullable: true })
  sourceWidth: number | null;

  @Column({ name: 'source_height', type: 'int', nullable: true })
  sourceHeight: number | null;

  @Column({ name: 'duration_seconds', type: 'double precision', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'renditions', type: 'jsonb', default: () => "'[]'::jsonb" })
  renditions: Rendition[];

  @Column({ name: 'thumbnail_path', type: 'text', nullable: true })
  thumbnailPath: string | null;

  @Column({ name: 'attempt_id', type: 'uuid', nullable: true })
  attemptId: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Index('idx_media_created_at')
  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}

