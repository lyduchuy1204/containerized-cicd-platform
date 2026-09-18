export interface ProbeResult {
  container: string;
  videoCodec: string;
  audioCodec?: string;
  videoStreamCount: number;
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
}

export interface AcceptanceLimits {
  maxInputBytes: number;
  maxDurationSeconds: number;
  recordedSizeBytes: number;
}

