import { ApiError } from '../types/api-error';
import { ApiRequestError } from './api-request-error';

const GRAPHQL_ENDPOINT = '/graphql';
const PREFLIGHT_HEADER = 'apollo-require-preflight';
const NETWORK_ERROR_CODE = 'NETWORK_UNAVAILABLE';
const TRANSPORT_ERROR_CODE = 'INTERNAL_ERROR';
const UPLOAD_FILE_KEY = '0';
const PERCENT_COMPLETE = 100;

interface GraphqlErrorEntry {
  message?: string;
  extensions?: { code?: unknown };
}

interface GraphqlEnvelope<TData> {
  data?: TData | null;
  errors?: GraphqlErrorEntry[];
}

export interface GraphqlOperation {
  query: string;
  variables?: Record<string, unknown>;
}

export async function requestGraphql<TData>(operation: GraphqlOperation): Promise<TData> {
  const response = await sendJson(operation);
  const envelope = (await readEnvelope<TData>(response)) as GraphqlEnvelope<TData>;
  return unwrapEnvelope(envelope);
}

export function uploadGraphql<TData>(
  operation: GraphqlOperation,
  file: File,
  onProgress: (percent: number) => void,
): Promise<TData> {
  return new Promise<TData>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', GRAPHQL_ENDPOINT);
    request.setRequestHeader(PREFLIGHT_HEADER, 'true');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * PERCENT_COMPLETE));
      }
    });
    request.addEventListener('load', () => {
      try {
        resolve(unwrapEnvelope(parseEnvelope<TData>(request.responseText)));
      } catch (error) {
        reject(error);
      }
    });
    request.addEventListener('error', () => {
      reject(new ApiRequestError({ code: NETWORK_ERROR_CODE, message: 'The connection failed.' }));
    });
    request.addEventListener('abort', () => {
      reject(new ApiRequestError({ code: 'UPLOAD_INCOMPLETE', message: 'The upload was cancelled.' }));
    });
    request.send(buildUploadBody(operation, file));
  });
}

function buildUploadBody(operation: GraphqlOperation, file: File): FormData {
  const body = new FormData();
  body.append('operations', JSON.stringify(operation));
  body.append('map', JSON.stringify({ [UPLOAD_FILE_KEY]: ['variables.file'] }));
  body.append(UPLOAD_FILE_KEY, file, file.name);
  return body;
}

async function sendJson(operation: GraphqlOperation): Promise<Response> {
  try {
    return await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(operation),
    });
  } catch {
    throw new ApiRequestError({
      code: NETWORK_ERROR_CODE,
      message: 'The connection failed.',
    });
  }
}

async function readEnvelope<TData>(response: Response): Promise<GraphqlEnvelope<TData>> {
  const text = await response.text();
  return parseEnvelope<TData>(text);
}

function parseEnvelope<TData>(text: string): GraphqlEnvelope<TData> {
  try {
    return JSON.parse(text) as GraphqlEnvelope<TData>;
  } catch {
    throw new ApiRequestError({
      code: TRANSPORT_ERROR_CODE,
      message: 'The server returned an unreadable response.',
    });
  }
}

function unwrapEnvelope<TData>(envelope: GraphqlEnvelope<TData>): TData {
  const firstError = envelope.errors?.[0];
  if (firstError !== undefined) {
    throw new ApiRequestError(toApiErrorEntry(firstError));
  }
  if (envelope.data === null || envelope.data === undefined) {
    throw new ApiRequestError({
      code: TRANSPORT_ERROR_CODE,
      message: 'The server returned no data.',
    });
  }
  return envelope.data;
}

function toApiErrorEntry(entry: GraphqlErrorEntry): ApiError {
  const code = typeof entry.extensions?.code === 'string' ? entry.extensions.code : TRANSPORT_ERROR_CODE;
  const message =
    typeof entry.message === 'string' && entry.message.length > 0
      ? entry.message
      : 'The request could not be completed.';
  return { code, message };
}
