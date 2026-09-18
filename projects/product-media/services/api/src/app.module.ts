import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONFIGURATION, loadConfiguration } from './config/configuration';
import { CLOCK } from './application/ports/clock';
import { ID_GENERATOR } from './application/ports/id-generator';
import { JOB_PUBLISHER } from './application/ports/job-publisher';
import { MEDIA_REPOSITORY } from './application/ports/media-repository';
import { STORAGE_GATEWAY } from './application/ports/storage-gateway';
import { CheckReadiness } from './application/use-cases/check-readiness';
import { GetMedia } from './application/use-cases/get-media';
import { ListMedia } from './application/use-cases/list-media';
import { ReadMediaFile } from './application/use-cases/read-media-file';
import { SweepExpiredMedia } from './application/use-cases/sweep-expired-media';
import { UploadVideo } from './application/use-cases/upload-video';
import { MediaEntity } from './infrastructure/persistence/media.entity';
import { TypeormMediaRepository } from './infrastructure/persistence/typeorm-media-repository';
import { FilesystemStorageGateway } from './infrastructure/storage/filesystem-storage-gateway';
import { BullmqJobPublisher } from './infrastructure/queue/bullmq-job-publisher';
import { SystemClock } from './infrastructure/system/system-clock';
import { UuidIdGenerator } from './infrastructure/system/uuid-id-generator';
import { ExpirySweepScheduler } from './infrastructure/scheduling/expiry-sweep-scheduler';
import { formatGraphqlError } from './interface/graphql/format-graphql-error';
import { HealthResolver } from './interface/graphql/health.resolver';
import { MediaResolver } from './interface/graphql/media.resolver';
import { HealthController } from './interface/http/health.controller';
import { MediaFileController } from './interface/http/media-file.controller';

const configuration = loadConfiguration();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: configuration.DATABASE_URL,
      entities: [MediaEntity],
      synchronize: false,
      migrationsRun: false,
    }),
    TypeOrmModule.forFeature([MediaEntity]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: configuration.GRAPHQL_PLAYGROUND,
      sortSchema: true,
      formatError: formatGraphqlError,
    }),
  ],
  controllers: [HealthController, MediaFileController],
  providers: [
    { provide: CONFIGURATION, useValue: configuration },
    { provide: MEDIA_REPOSITORY, useClass: TypeormMediaRepository },
    { provide: STORAGE_GATEWAY, useClass: FilesystemStorageGateway },
    { provide: JOB_PUBLISHER, useClass: BullmqJobPublisher },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    UploadVideo,
    ListMedia,
    GetMedia,
    ReadMediaFile,
    CheckReadiness,
    SweepExpiredMedia,
    ExpirySweepScheduler,
    MediaResolver,
    HealthResolver,
  ],
})
export class AppModule {}

