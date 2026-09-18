import { RenditionLabel, RenditionTarget } from './rendition-target';

const LADDER: readonly RenditionTarget[] = [
  { label: '2k', width: 2560, height: 1440 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '720p', width: 1280, height: 720 },
  { label: '480p', width: 854, height: 480 },
];

export function resolveRenditionSet(sourceWidth: number, sourceHeight: number): RenditionTarget[] {
  return LADDER.filter((target) => target.height <= sourceHeight).map((target) => ({
    label: target.label,
    width: scaleWidth(sourceWidth, sourceHeight, target.height),
    height: target.height,
  }));
}

export function buildOutputFilename(label: RenditionLabel): string {
  return `${label}.mp4`;
}

function scaleWidth(sourceWidth: number, sourceHeight: number, targetHeight: number): number {
  const scaled = Math.round((sourceWidth * targetHeight) / sourceHeight);
  return scaled % 2 === 0 ? scaled : scaled + 1;
}

