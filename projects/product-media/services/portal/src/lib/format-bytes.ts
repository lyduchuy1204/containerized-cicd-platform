const UNIT_LABELS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const UNIT_STEP = 1024;

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return 'unknown size';
  }
  if (sizeBytes < UNIT_STEP) {
    return `${sizeBytes} B`;
  }
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= UNIT_STEP && unitIndex < UNIT_LABELS.length - 1) {
    value = value / UNIT_STEP;
    unitIndex += 1;
  }
  const rounded = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${UNIT_LABELS[unitIndex]}`;
}
