import { execFile } from 'child_process';
import { promisify } from 'util';
import { ProbeResult } from '../../domain/probe-result';
import { MediaProbe } from '../../application/ports/media-probe';

const run = promisify(execFile);
const PROBE_TIMEOUT_MS = 30000;

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { format_name?: string; duration?: string; size?: string };
}

export class FfprobeMediaProbe implements MediaProbe {
  async inspect(filePath: string): Promise<ProbeResult> {
    const { stdout } = await run(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', filePath],
      { timeout: PROBE_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as FfprobeOutput;
    const streams = parsed.streams ?? [];
    const videoStreams = streams.filter((stream) => stream.codec_type === 'video');
    const audioStream = streams.find((stream) => stream.codec_type === 'audio');
    const first = videoStreams[0];

    return {
      container: parsed.format?.format_name ?? '',
      videoCodec: first?.codec_name ?? '',
      audioCodec: audioStream?.codec_name,
      videoStreamCount: videoStreams.length,
      width: first?.width ?? 0,
      height: first?.height ?? 0,
      durationSeconds: Number(parsed.format?.duration ?? 0),
      sizeBytes: Number(parsed.format?.size ?? 0),
    };
  }
}

