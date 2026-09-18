import { execFile } from 'child_process';
import { stat } from 'fs/promises';
import { promisify } from 'util';
import { RenditionOutput } from '../../domain/rendition-target';
import {
  RenderRenditionInput,
  RenderThumbnailInput,
  Transcoder,
} from '../../application/ports/transcoder';

const run = promisify(execFile);

export class FfmpegTranscoder implements Transcoder {
  async renderRendition(input: RenderRenditionInput): Promise<RenditionOutput> {
    const scale = `scale=${input.target.width}:${input.target.height}`;
    await run(
      'ffmpeg',
      [
        '-y',
        '-i', input.sourcePath,
        '-vf', scale,
        '-c:v', 'libx264',
        '-preset', input.preset,
        '-threads', String(input.threads),
        '-c:a', 'aac',
        '-movflags', '+faststart',
        input.destinationPath,
      ],
      { timeout: input.timeoutSeconds * 1000, maxBuffer: 8 * 1024 * 1024 },
    );
    const info = await stat(input.destinationPath);
    return {
      label: input.target.label,
      width: input.target.width,
      height: input.target.height,
      sizeBytes: info.size,
      path: input.destinationPath,
    };
  }

  async renderThumbnail(input: RenderThumbnailInput): Promise<string> {
    await run(
      'ffmpeg',
      [
        '-y',
        '-ss', input.timestamp,
        '-i', input.sourcePath,
        '-frames:v', '1',
        '-q:v', '3',
        input.destinationPath,
      ],
      { timeout: input.timeoutSeconds * 1000, maxBuffer: 8 * 1024 * 1024 },
    );
    return input.destinationPath;
  }
}

