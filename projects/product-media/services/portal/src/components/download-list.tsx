import { formatBytes } from '../lib/format-bytes';
import { Rendition } from '../types/media';

const THUMBNAIL_DOWNLOAD_NAME = 'thumbnail.jpg';

interface DownloadListProps {
  filename: string;
  renditions: Rendition[];
  thumbnailUrl?: string;
}

export function DownloadList({ filename, renditions, thumbnailUrl }: DownloadListProps) {
  if (renditions.length === 0) {
    return null;
  }
  const baseName = stripExtension(filename);
  return (
    <div className="downloads">
      <p className="field-label">Download</p>
      <ul className="download-list">
        {renditions.map((rendition) => (
          <li key={rendition.label}>
            <a href={rendition.url} download={`${baseName}-${rendition.label}.mp4`}>
              {`${rendition.label} video`}
            </a>
            <span className="download-meta">
              {`${rendition.width}x${rendition.height}, ${formatBytes(rendition.sizeBytes)}`}
            </span>
          </li>
        ))}
        {thumbnailUrl !== undefined ? (
          <li>
            <a href={thumbnailUrl} download={`${baseName}-${THUMBNAIL_DOWNLOAD_NAME}`}>
              Thumbnail image
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}
