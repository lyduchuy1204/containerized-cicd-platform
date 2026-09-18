import { Media } from '../types/media';
import { requestGraphql, uploadGraphql } from './graphql-client';

const MEDIA_FIELDS = `
  id
  filename
  sizeBytes
  status
  progress
  sourceWidth
  sourceHeight
  durationSeconds
  thumbnailUrl
  errorMessage
  createdAt
  updatedAt
  renditions {
    label
    width
    height
    sizeBytes
    url
  }
`;

const MEDIA_LIST_QUERY = `query MediaList { mediaList { ${MEDIA_FIELDS} } }`;
const MEDIA_QUERY = `query MediaItem($id: ID!) { media(id: $id) { ${MEDIA_FIELDS} } }`;
const UPLOAD_VIDEO_MUTATION = `mutation UploadVideo($file: Upload!) { uploadVideo(file: $file) { ${MEDIA_FIELDS} } }`;

export async function fetchMediaList(): Promise<Media[]> {
  const data = await requestGraphql<{ mediaList: Media[] }>({ query: MEDIA_LIST_QUERY });
  return data.mediaList;
}

export async function fetchMedia(id: string): Promise<Media> {
  const data = await requestGraphql<{ media: Media }>({
    query: MEDIA_QUERY,
    variables: { id },
  });
  return data.media;
}

export async function uploadVideo(
  file: File,
  onProgress: (percent: number) => void,
): Promise<Media> {
  const data = await uploadGraphql<{ uploadVideo: Media }>(
    { query: UPLOAD_VIDEO_MUTATION, variables: { file: null } },
    file,
    onProgress,
  );
  return data.uploadVideo;
}
