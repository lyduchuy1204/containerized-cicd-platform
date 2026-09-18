import { MediaStatus } from '../types/media';

interface StatusPresentation {
  label: string;
  toneClassName: string;
}

const PRESENTATION_BY_STATUS: Readonly<Record<MediaStatus, StatusPresentation>> = {
  UPLOADING: { label: 'Uploading', toneClassName: 'badge badge-progress' },
  QUEUED: { label: 'Queued', toneClassName: 'badge badge-waiting' },
  PROCESSING: { label: 'Processing', toneClassName: 'badge badge-progress' },
  COMPLETED: { label: 'Completed', toneClassName: 'badge badge-success' },
  FAILED: { label: 'Failed', toneClassName: 'badge badge-failure' },
};

interface StatusBadgeProps {
  status: MediaStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = PRESENTATION_BY_STATUS[status];
  return <span className={presentation.toneClassName}>{presentation.label}</span>;
}
