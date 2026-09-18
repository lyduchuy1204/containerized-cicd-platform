import { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '../../api/api-request-error';
import { uploadVideo } from '../../api/media-api';
import { describeApiError } from '../../lib/describe-api-error';
import { formatBytes } from '../../lib/format-bytes';
import { validateSelectedFile } from '../../lib/validate-selected-file';
import { ErrorPresentation } from '../../types/api-error';
import { Media } from '../../types/media';
import { insertMedia, MEDIA_LIST_QUERY_KEY } from './media-cache';

const ADVISORY_MAX_UPLOAD_BYTES = 524288000;
const ACCEPTED_INPUT_TYPES = 'video/mp4,.mp4';

export function UploadPanel() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preCheckReason, setPreCheckReason] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [failure, setFailure] = useState<ErrorPresentation | null>(null);
  const [succeededFilename, setSucceededFilename] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => uploadVideo(file, setProgressPercent),
    onSuccess: (media: Media) => {
      queryClient.setQueryData<Media[]>(MEDIA_LIST_QUERY_KEY, (current) =>
        insertMedia(current, media),
      );
      void queryClient.invalidateQueries({ queryKey: MEDIA_LIST_QUERY_KEY });
      setSucceededFilename(media.filename);
      setFailure(null);
      clearSelection();
    },
    onError: (error: unknown) => {
      const presentation = describeApiError(toApiError(error));
      setFailure(presentation);
      setSucceededFilename(null);
      if (!presentation.keepsSelection) {
        clearSelection();
      }
    },
  });

  function clearSelection() {
    setSelectedFile(null);
    setPreCheckReason(null);
    setProgressPercent(0);
    if (inputRef.current !== null) {
      inputRef.current.value = '';
    }
  }

  function handleSelection(file: File | null) {
    setFailure(null);
    setSucceededFilename(null);
    setProgressPercent(0);
    setSelectedFile(file);
    if (file === null) {
      setPreCheckReason(null);
      return;
    }
    const result = validateSelectedFile(file, ADVISORY_MAX_UPLOAD_BYTES);
    setPreCheckReason(result.isValid ? null : (result.reason ?? null));
  }

  const isUploading = mutation.isPending;
  const canSubmit = selectedFile !== null && preCheckReason === null && !isUploading;

  return (
    <section className="panel" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Upload a video</h2>

      <div className="field">
        <label className="field-label" htmlFor={inputId}>
          MP4 file
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPTED_INPUT_TYPES}
          disabled={isUploading}
          onChange={(event) => handleSelection(event.target.files?.[0] ?? null)}
        />
        <p className="field-hint">
          {`MP4 only, up to ${formatBytes(ADVISORY_MAX_UPLOAD_BYTES)}. The server applies the final limit.`}
        </p>
      </div>

      {selectedFile !== null ? (
        <p className="selection">{`${selectedFile.name} - ${formatBytes(selectedFile.size)}`}</p>
      ) : null}

      {preCheckReason !== null ? (
        <p className="panel-state-detail" role="alert">
          {preCheckReason}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (selectedFile !== null) {
            mutation.mutate(selectedFile);
          }
        }}
      >
        {isUploading ? 'Uploading' : 'Upload'}
      </button>

      {isUploading ? (
        <div className="upload-progress" role="status" aria-live="polite">
          <progress max={100} value={progressPercent}>
            {progressPercent}%
          </progress>
          <span>{`${progressPercent}%`}</span>
        </div>
      ) : null}

      {succeededFilename !== null ? (
        <p className="panel-success" role="status" aria-live="polite">
          {`${succeededFilename} was uploaded and queued for processing.`}
        </p>
      ) : null}

      {failure !== null ? (
        <div className="panel-state" role="alert">
          <p className="panel-state-headline">{failure.headline}</p>
          <p className="panel-state-detail">{failure.detail}</p>
          {failure.isRetryable && selectedFile !== null ? (
            <button type="button" onClick={() => mutation.mutate(selectedFile)}>
              Retry upload
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
