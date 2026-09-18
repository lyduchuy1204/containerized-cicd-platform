import { MediaId } from '../../domain/media';

export interface IdGenerator {
  nextMediaId(): MediaId;
}

export const ID_GENERATOR = Symbol('ID_GENERATOR');

