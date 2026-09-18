import { copyFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { MediaId } from '../../domain/media';
import { processedObjectPath, sourceObjectPath } from '../../domain/media-paths';
import { StorageGateway } from '../../application/ports/storage-gateway';

export class FilesystemStorageGateway implements StorageGateway {
  private readonly uploadsRoot: string;

  constructor(uploadsDir: string) {
    this.uploadsRoot = path.resolve(uploadsDir);
  }

  async readSource(mediaId: MediaId, destination: string): Promise<void> {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(this.absolute(sourceObjectPath(mediaId)), destination);
  }

  async writeOutput(mediaId: MediaId, source: string, filename: string): Promise<string> {
    const objectPath = processedObjectPath(mediaId, filename);
    const target = this.absolute(objectPath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    return objectPath;
  }

  private absolute(objectPath: string): string {
    const resolved = path.resolve(this.uploadsRoot, objectPath);
    if (resolved !== this.uploadsRoot && !resolved.startsWith(this.uploadsRoot + path.sep)) {
      throw new Error('resolved path escapes the uploads root');
    }
    return resolved;
  }
}
