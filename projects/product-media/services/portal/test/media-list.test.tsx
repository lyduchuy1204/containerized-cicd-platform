import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaList } from '../src/components/media-list';
import { buildMedia, buildRendition } from './media-fixtures';

const noop = () => undefined;

describe('MediaList', () => {
  it('explains the empty state rather than rendering a blank area', () => {
    render(<MediaList mediaList={[]} isLoading={false} onRetry={noop} />);
    expect(screen.getByText('No uploads yet')).toBeInTheDocument();
  });

  it('shows a loading indication', () => {
    render(<MediaList mediaList={[]} isLoading onRetry={noop} />);
    expect(screen.getByText('Loading your uploads')).toBeInTheDocument();
  });

  it('shows the reason and a retry action when loading failed', () => {
    const onRetry = vi.fn();
    render(
      <MediaList
        mediaList={[]}
        isLoading={false}
        errorHeadline="The service is temporarily unavailable"
        errorDetail="Database is unavailable"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The service is temporarily unavailable');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders one row per media item', () => {
    const mediaList = [
      buildMedia({ id: 'a', filename: 'first.mp4' }),
      buildMedia({ id: 'b', filename: 'second.mp4' }),
    ];
    render(<MediaList mediaList={mediaList} isLoading={false} onRetry={noop} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders one option per returned rendition and never a fixed set of four', () => {
    const media = buildMedia({
      renditions: [
        buildRendition({ label: '720p', width: 1280, height: 720 }),
        buildRendition({ label: '480p', width: 854, height: 480 }),
        buildRendition({ label: '1080p', width: 1920, height: 1080 }),
      ],
    });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('renders the processing state without a thumbnail or a player', () => {
    const media = buildMedia({
      status: 'PROCESSING',
      progress: 40,
      thumbnailUrl: undefined,
      renditions: [],
    });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('renders the queued state without a player', () => {
    const media = buildMedia({ status: 'QUEUED', progress: 0, renditions: [] });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('shows the reason from the item and no player when processing failed', () => {
    const media = buildMedia({
      status: 'FAILED',
      progress: 0,
      renditions: [],
      thumbnailUrl: undefined,
      errorMessage: 'duration above the accepted maximum',
    });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);
    expect(screen.getByText('duration above the accepted maximum')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('shows the thumbnail and a player once processing completed', () => {
    const media = buildMedia({ renditions: [buildRendition()] });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/files/media-1/thumbnail.jpg');
    expect(screen.getByLabelText('Playback of the 1080p rendition')).toBeInTheDocument();
  });

  it('offers a download link for every rendition and for the thumbnail', () => {
    const media = buildMedia({
      filename: 'holiday.mp4',
      renditions: [
        buildRendition({ label: '1080p', url: '/files/media-1/1080p.mp4' }),
        buildRendition({ label: '480p', width: 854, height: 480, url: '/files/media-1/480p.mp4' }),
      ],
    });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);

    const video1080p = screen.getByRole('link', { name: '1080p video' });
    expect(video1080p).toHaveAttribute('href', '/files/media-1/1080p.mp4');
    expect(video1080p).toHaveAttribute('download', 'holiday-1080p.mp4');

    expect(screen.getByRole('link', { name: '480p video' })).toHaveAttribute(
      'href',
      '/files/media-1/480p.mp4',
    );
    expect(screen.getByRole('link', { name: 'Thumbnail image' })).toHaveAttribute(
      'download',
      'holiday-thumbnail.jpg',
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('offers no download links while an item is still processing', () => {
    const media = buildMedia({ status: 'PROCESSING', renditions: [], thumbnailUrl: undefined });
    render(<MediaList mediaList={[media]} isLoading={false} onRetry={noop} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
