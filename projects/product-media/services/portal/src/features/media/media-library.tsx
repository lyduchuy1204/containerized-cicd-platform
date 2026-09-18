import { MediaList } from '../../components/media-list';
import { toApiError } from '../../api/api-request-error';
import { describeApiError } from '../../lib/describe-api-error';
import { useMediaList } from './use-media-list';

export function MediaLibrary() {
  const query = useMediaList();
  const presentation = query.error === null ? undefined : describeApiError(toApiError(query.error));
  return (
    <section className="panel" aria-labelledby="library-heading">
      <h2 id="library-heading">Your uploads</h2>
      <MediaList
        mediaList={query.data ?? []}
        isLoading={query.isPending}
        errorHeadline={presentation?.headline}
        errorDetail={presentation?.detail}
        onRetry={() => void query.refetch()}
      />
    </section>
  );
}
