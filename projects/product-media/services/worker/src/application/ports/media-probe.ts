import { ProbeResult } from '../../domain/probe-result';

export interface MediaProbe {
  inspect(filePath: string): Promise<ProbeResult>;
}

