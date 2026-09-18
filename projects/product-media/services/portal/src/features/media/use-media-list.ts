import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { fetchMediaList } from '../../api/media-api';
import { hasPendingMedia, resolvePollIntervalMs } from '../../lib/poll-schedule';
import { MEDIA_LIST_QUERY_KEY } from './media-cache';

export function useMediaList() {
  const pollCount = useRef(0);
  return useQuery({
    queryKey: MEDIA_LIST_QUERY_KEY,
    queryFn: fetchMediaList,
    retry: false,
    refetchInterval: (query) => {
      const mediaList = query.state.data;
      if (mediaList === undefined || !hasPendingMedia(mediaList)) {
        pollCount.current = 0;
        return false;
      }
      const intervalMs = resolvePollIntervalMs(pollCount.current);
      pollCount.current += 1;
      return intervalMs;
    },
  });
}
