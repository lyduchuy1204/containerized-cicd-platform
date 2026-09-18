import { Inject, Injectable } from '@nestjs/common';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { CONFIGURATION, Configuration } from '../../config/configuration';
import { MediaId } from '../../domain/media';
import { originalsDirectory, processedDirectory, sourceObjectPath } from '../../domain/media-paths';
import { assertPathInsideRoot } from '../../domain/path-safety';
import { storageUnavailable } from '../../domain/media-error';
import {
  ByteRange,
  FileStat,
  StorageGateway,
} from '../../application/ports/storage-gateway';

@Injectable()
export class FilesystemStorageGateway implements StorageGateway {
  private readonly uploadsRoot: string;
  private readonly tmpDir: string;

  constructor(@Inject(CONFIGURATION) configuration: Configuration) {
    this.uploadsRoot = path.resolve(configuration.UPLOADS_DIR);
    this.tmpDir = path.resolve(configuration.TMP_DIR);
  }

  async writeSource(mediaId: MediaId, bytes: Readable): Promise<number> {
    await mkdir(this.tmpDir, { recursive: true });
    const stagingPath = path.join(this.tmpDir, `${randomUUID()}.part`);
    let writtenBytes = 0;
    bytes.on('data', (chunk: Buffer) => {
      writtenBytes += chunk.length;
    });
    await pipeline(bytes, createWriteStream(stagingPath));
    const finalPath = this.absolutePath(sourceObjectPath(mediaId));
    await mkdir(path.dirname(finalPath), { recursive: true });
    await this.movePart(stagingPath, finalPath);
    return writtenBytes;
  }

  async openRead(objectPath: string, range?: ByteRange): Promise<Readable> {
    const absolute = this.absolutePath(objectPath);
    return createReadStream(absolute, range ? { start: range.start, end: range.end } : undefined);
  }

  async stat(objectPath: string): Promise<FileStat | null> {
    try {
      const info = await stat(this.absolutePath(objectPath));
      return info.isFile() ? { sizeBytes: info.size, modifiedAt: info.mtime } : null;
    } catch {
      return null;
    }
  }

  async deleteMedia(mediaId: MediaId): Promise<void> {
    await rm(this.absolutePath(originalsDirectory(mediaId)), { recursive: true, force: true });
    await rm(this.absolutePath(processedDirectory(mediaId)), { recursive: true, force: true });
  }

  async ensureWritable(): Promise<void> {
    try {
      await mkdir(this.uploadsRoot, { recursive: true });
      await mkdir(this.tmpDir, { recursive: true });
      await this.probeWrite(this.uploadsRoot);
      await this.probeWrite(this.tmpDir);
    } catch {
      throw storageUnavailable();
    }
  }

  private async probeWrite(directory: string): Promise<void> {
    const probePath = path.join(directory, `.write-probe-${randomUUID()}`);
    try {
      await writeFile(probePath, '');
    } finally {
      await rm(probePath, { force: true });
    }
  }

  private absolutePath(objectPath: string): string {
    assertPathInsideRoot(this.uploadsRoot, objectPath);
    return path.resolve(this.uploadsRoot, objectPath);
  }

  private async movePart(from: string, to: string): Promise<void> {
    const { rename, copyFile, unlink } = await import('fs/promises');
    try {
      await rename(from, to);
    } catch {
      await copyFile(from, to);
      await unlink(from);
    }
  }
}

