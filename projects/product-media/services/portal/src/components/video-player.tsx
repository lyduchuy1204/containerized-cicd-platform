interface VideoPlayerProps {
  sourceUrl: string;
  posterUrl?: string;
  label: string;
}

export function VideoPlayer({ sourceUrl, posterUrl, label }: VideoPlayerProps) {
  return (
    <video
      className="player"
      key={sourceUrl}
      src={sourceUrl}
      poster={posterUrl}
      controls
      preload="metadata"
      aria-label={`Playback of the ${label} rendition`}
    />
  );
}
