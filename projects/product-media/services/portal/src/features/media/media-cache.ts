import { Media } from '../../types/media';

export const MEDIA_LIST_QUERY_KEY = ['mediaList'] as const;

export function insertMedia(mediaList: Media[] | undefined, media: Media): Media[] {
  const withoutDuplicate = (mediaList ?? []).filter((existing) => existing.id !== media.id);
  return [media, ...withoutDuplicate];
}
