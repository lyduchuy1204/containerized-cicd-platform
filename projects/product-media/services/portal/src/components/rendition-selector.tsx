import { useId } from 'react';
import { Rendition } from '../types/media';

interface RenditionSelectorProps {
  renditions: Rendition[];
  selectedLabel: string;
  onSelect: (label: string) => void;
}

export function RenditionSelector({
  renditions,
  selectedLabel,
  onSelect,
}: RenditionSelectorProps) {
  const selectorId = useId();
  if (renditions.length === 0) {
    return null;
  }
  return (
    <div className="rendition-selector">
      <label className="field-label" htmlFor={selectorId}>
        Rendition
      </label>
      <select
        id={selectorId}
        value={selectedLabel}
        onChange={(event) => onSelect(event.target.value)}
      >
        {renditions.map((rendition) => (
          <option key={rendition.label} value={rendition.label}>
            {`${rendition.label} (${rendition.width}x${rendition.height})`}
          </option>
        ))}
      </select>
    </div>
  );
}
