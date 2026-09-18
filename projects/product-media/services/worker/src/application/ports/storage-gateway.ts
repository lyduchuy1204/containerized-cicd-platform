import { MediaId } from '../../domain/media';

export interface StorageGateway {
  readSource(mediaId: MediaId, destination: string): Promise<void>;
  writeOutput(mediaId: MediaId, source: string, filename: string): Promise<string>;
}
