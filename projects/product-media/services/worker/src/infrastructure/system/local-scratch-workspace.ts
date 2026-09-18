import { mkdir, rm } from 'fs/promises';
import * as path from 'path';
import { AttemptId } from '../../domain/media';
import { ScratchWorkspace } from '../../application/ports/scratch-workspace';

export class LocalScratchWorkspace implements ScratchWorkspace {
  private readonly scratchRoot: string;

  constructor(scratchDir: string) {
    this.scratchRoot = path.resolve(scratchDir);
  }

  async create(attemptId: AttemptId): Promise<string> {
    const directory = this.directoryFor(attemptId);
    await mkdir(directory, { recursive: true });
    return directory;
  }

  pathFor(attemptId: AttemptId, filename: string): string {
    return path.join(this.directoryFor(attemptId), filename);
  }

  async discard(attemptId: AttemptId): Promise<void> {
    await rm(this.directoryFor(attemptId), { recursive: true, force: true });
  }

  private directoryFor(attemptId: AttemptId): string {
    return path.join(this.scratchRoot, attemptId);
  }
}

