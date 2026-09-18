import { Media } from '../types/media';
import { MediaRow } from './media-row';

interface MediaListProps {
  mediaList: Media[];
  isLoading: boolean;
  errorHeadline?: string;
  errorDetail?: string;
  onRetry: () => void;
}

export function MediaList({
  mediaList,
  isLoading,
  errorHeadline,
  errorDetail,
  onRetry,
}: MediaListProps) {
  if (errorHeadline !== undefined) {
    return (
      <div className="panel-state" role="alert">
        <p className="panel-state-headline">{errorHeadline}</p>
        {errorDetail !== undefined ? <p className="panel-state-detail">{errorDetail}</p> : null}
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="panel-state" role="status" aria-live="polite">
        <p className="panel-state-headline">Loading your uploads</p>
      </div>
    );
  }

  if (mediaList.length === 0) {
    return (
      <div className="panel-state">
        <p className="panel-state-headline">No uploads yet</p>
        <p className="panel-state-detail">
          Choose an MP4 file above to upload it. Processing starts automatically and this list
          updates on its own.
        </p>
      </div>
    );
  }

  return (
    <ul className="media-list">
      {mediaList.map((media) => (
        <MediaRow key={media.id} media={media} />
      ))}
    </ul>
  );
}
