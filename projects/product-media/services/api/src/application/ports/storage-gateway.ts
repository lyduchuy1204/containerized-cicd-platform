import { Readable } from 'stream';
import { MediaId } from '../../domain/media';

export interface ByteRange {
  start: number;
  end?: number;
}

export interface FileStat {
  sizeBytes: number;
  modifiedAt: Date;
}

export interface StorageGateway {
  writeSource(mediaId: MediaId, bytes: Readable): Promise<number>;
  openRead(objectPath: string, range?: ByteRange): Promise<Readable>;
  stat(objectPath: string): Promise<FileStat | null>;
  deleteMedia(mediaId: MediaId): Promise<void>;
  ensureWritable(): Promise<void>;
}

export const STORAGE_GATEWAY = Symbol('STORAGE_GATEWAY');

