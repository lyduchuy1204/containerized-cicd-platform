import { Field, ID, Int, Float, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum MediaStatusType {
  UPLOADING = 'UPLOADING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

registerEnumType(MediaStatusType, { name: 'MediaStatus' });

@ObjectType('Rendition')
export class RenditionType {
  @Field()
  label: string;

  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;

  @Field(() => Int)
  sizeBytes: number;

  @Field()
  url: string;
}

@ObjectType('Media')
export class MediaType {
  @Field(() => ID)
  id: string;

  @Field()
  filename: string;

  @Field(() => Int)
  sizeBytes: number;

  @Field(() => MediaStatusType)
  status: MediaStatusType;

  @Field(() => Int)
  progress: number;

  @Field(() => Int, { nullable: true })
  sourceWidth?: number;

  @Field(() => Int, { nullable: true })
  sourceHeight?: number;

  @Field(() => Float, { nullable: true })
  durationSeconds?: number;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field(() => [RenditionType])
  renditions: RenditionType[];

  @Field({ nullable: true })
  errorMessage?: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

