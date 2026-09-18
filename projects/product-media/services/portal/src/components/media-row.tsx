import { formatBytes } from '../lib/format-bytes';
import { Media } from '../types/media';
import { DownloadList } from './download-list';
import { MediaPlayback } from './media-playback';
import { StatusBadge } from './status-badge';

interface MediaRowProps {
  media: Media;
}

export function MediaRow({ media }: MediaRowProps) {
  const isCompleted = media.status === 'COMPLETED';
  const isFailed = media.status === 'FAILED';
  const isInProgress = !isCompleted && !isFailed;
  return (
    <li className="media-row">
      <div className="media-row-header">
        <div className="media-thumbnail">
          {isCompleted && media.thumbnailUrl !== undefined ? (
            <img src={media.thumbnailUrl} alt={`Thumbnail of ${media.filename}`} />
          ) : (
            <span className="media-thumbnail-placeholder" aria-hidden="true" />
          )}
        </div>
        <div className="media-summary">
          <p className="media-filename">{media.filename}</p>
          <p className="media-meta">
            {formatBytes(media.sizeBytes)}
            {media.sourceWidth !== undefined && media.sourceHeight !== undefined
              ? ` - source ${media.sourceWidth}x${media.sourceHeight}`
              : ''}
          </p>
          <div className="media-status" role="status" aria-live="polite">
            <StatusBadge status={media.status} />
            {isInProgress ? <span className="media-progress">{media.progress}%</span> : null}
          </div>
        </div>
      </div>

      {isInProgress ? (
        <progress className="media-progress-bar" max={100} value={media.progress}>
          {media.progress}%
        </progress>
      ) : null}

      {isFailed ? (
        <p className="media-error">{media.errorMessage ?? 'Processing failed.'}</p>
      ) : null}

      {isCompleted ? (
        <MediaPlayback renditions={media.renditions} thumbnailUrl={media.thumbnailUrl} />
      ) : null}

      {isCompleted ? (
        <DownloadList
          filename={media.filename}
          renditions={media.renditions}
          thumbnailUrl={media.thumbnailUrl}
        />
      ) : null}
    </li>
  );
}
