import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLUpload, type FileUpload } from 'graphql-upload-minimal';
import { GetMedia } from '../../application/use-cases/get-media';
import { ListMedia } from '../../application/use-cases/list-media';
import { UploadVideo } from '../../application/use-cases/upload-video';
import { presentMedia } from './media-presenter';
import { MediaType } from './media.type';

@Resolver(() => MediaType)
export class MediaResolver {
  constructor(
    private readonly uploadVideo: UploadVideo,
    private readonly listMedia: ListMedia,
    private readonly getMedia: GetMedia,
  ) {}

  @Query(() => [MediaType], { name: 'mediaList' })
  async mediaList(): Promise<MediaType[]> {
    const mediaList = await this.listMedia.execute();
    return mediaList.map(presentMedia);
  }

  @Query(() => MediaType, { name: 'media', nullable: true })
  async media(@Args('id', { type: () => ID }) id: string): Promise<MediaType> {
    return presentMedia(await this.getMedia.execute(id));
  }

  @Mutation(() => MediaType, { name: 'uploadVideo' })
  async upload(
    @Args({ name: 'file', type: () => GraphQLUpload }) file: Promise<FileUpload>,
  ): Promise<MediaType> {
    const resolved = await file;
    const media = await this.uploadVideo.execute({
      filename: resolved.filename,
      mimetype: resolved.mimetype,
      bytes: resolved.createReadStream(),
    });
    return presentMedia(media);
  }
}

