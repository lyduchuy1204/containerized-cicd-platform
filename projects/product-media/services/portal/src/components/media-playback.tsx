import { useState } from 'react';
import { Rendition } from '../types/media';
import { RenditionSelector } from './rendition-selector';
import { VideoPlayer } from './video-player';

interface MediaPlaybackProps {
  renditions: Rendition[];
  thumbnailUrl?: string;
}

export function MediaPlayback({ renditions, thumbnailUrl }: MediaPlaybackProps) {
  const [requestedLabel, setRequestedLabel] = useState<string>('');
  if (renditions.length === 0) {
    return null;
  }
  const selected = resolveSelected(renditions, requestedLabel);
  return (
    <div className="playback">
      <RenditionSelector
        renditions={renditions}
        selectedLabel={selected.label}
        onSelect={setRequestedLabel}
      />
      <VideoPlayer sourceUrl={selected.url} posterUrl={thumbnailUrl} label={selected.label} />
    </div>
  );
}

function resolveSelected(renditions: Rendition[], requestedLabel: string): Rendition {
  return renditions.find((rendition) => rendition.label === requestedLabel) ?? renditions[0];
}
