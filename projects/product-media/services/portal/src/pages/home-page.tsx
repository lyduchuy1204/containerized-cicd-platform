import { MediaLibrary } from '../features/media/media-library';
import { UploadPanel } from '../features/media/upload-panel';

export function HomePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Media platform</h1>
        <p>Upload an MP4 video, follow processing, and play the generated renditions.</p>
      </header>
      <UploadPanel />
      <MediaLibrary />
    </main>
  );
}
