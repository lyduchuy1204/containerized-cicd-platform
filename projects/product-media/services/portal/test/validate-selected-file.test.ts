import { describe, expect, it } from 'vitest';
import { validateSelectedFile } from '../src/lib/validate-selected-file';
import { formatBytes } from '../src/lib/format-bytes';

const MAX_BYTES = 1000;

function buildFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateSelectedFile', () => {
  it('accepts an mp4 within the limit', () => {
    const result = validateSelectedFile(buildFile('a.mp4', 'video/mp4', 500), MAX_BYTES);
    expect(result.isValid).toBe(true);
  });

  it('rejects a non mp4 extension', () => {
    const result = validateSelectedFile(buildFile('a.mov', 'video/quicktime', 500), MAX_BYTES);
    expect(result.isValid).toBe(false);
  });

  it('rejects a file above the limit', () => {
    const result = validateSelectedFile(buildFile('a.mp4', 'video/mp4', 5000), MAX_BYTES);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain(formatBytes(MAX_BYTES));
  });

  it('rejects an empty file', () => {
    const result = validateSelectedFile(buildFile('a.mp4', 'video/mp4', 0), MAX_BYTES);
    expect(result.isValid).toBe(false);
  });

  it('accepts an mp4 whose type the browser did not report', () => {
    const result = validateSelectedFile(buildFile('a.mp4', '', 500), MAX_BYTES);
    expect(result.isValid).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formats bytes below one kilobyte without a unit prefix', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('drops the decimal once the value reaches three digits', () => {
    expect(formatBytes(604648)).toBe('590 KB');
  });

  it('keeps one decimal below three digits', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats the upload limit readably', () => {
    expect(formatBytes(524288000)).toBe('500 MB');
  });
});
