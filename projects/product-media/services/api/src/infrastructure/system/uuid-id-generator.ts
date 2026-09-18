import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MediaId } from '../../domain/media';
import { IdGenerator } from '../../application/ports/id-generator';

@Injectable()
export class UuidIdGenerator implements IdGenerator {
  nextMediaId(): MediaId {
    return randomUUID();
  }
}

