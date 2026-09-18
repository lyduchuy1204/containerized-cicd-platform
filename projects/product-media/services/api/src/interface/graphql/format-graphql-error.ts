import { GraphQLFormattedError } from 'graphql';
import { ErrorCode } from '../../domain/error-code';
import { MediaError } from '../../domain/media-error';

const APOLLO_INTERNAL_CODE = 'INTERNAL_SERVER_ERROR';
const GENERIC_INTERNAL_MESSAGE = 'An unexpected problem occurred';
const MAXIMUM_CAUSE_DEPTH = 8;

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
  thrownError: unknown,
): GraphQLFormattedError {
  const mediaError = findMediaError(thrownError, 0);
  if (mediaError !== null) {
    return applyCode({ ...formattedError, message: mediaError.message }, mediaError.code);
  }
  if (formattedError.extensions?.code !== APOLLO_INTERNAL_CODE) {
    return formattedError;
  }
  return applyCode({ ...formattedError, message: GENERIC_INTERNAL_MESSAGE }, 'INTERNAL_ERROR');
}

function applyCode(
  formattedError: GraphQLFormattedError,
  code: ErrorCode,
): GraphQLFormattedError {
  return {
    ...formattedError,
    extensions: { ...formattedError.extensions, code },
  };
}

function findMediaError(candidate: unknown, depth: number): MediaError | null {
  if (depth > MAXIMUM_CAUSE_DEPTH || candidate === null || typeof candidate !== 'object') {
    return null;
  }
  if (candidate instanceof MediaError) {
    return candidate;
  }
  const nested = candidate as { originalError?: unknown; cause?: unknown };
  return (
    findMediaError(nested.originalError, depth + 1) ?? findMediaError(nested.cause, depth + 1)
  );
}
