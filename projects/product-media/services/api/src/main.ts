import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { graphqlUploadExpress } from 'graphql-upload-minimal';
import { AppModule } from './app.module';
import { CONFIGURATION, Configuration, loadConfiguration } from './config/configuration';
import { STORAGE_GATEWAY, StorageGateway } from './application/ports/storage-gateway';
import { MediaErrorFilter } from './interface/errors/media-error.filter';
import { HealthResolver } from './interface/graphql/health.resolver';
import { JsonLogger } from './infrastructure/observability/json-logger';

const LISTEN_ADDRESS = '0.0.0.0';

async function bootstrap(): Promise<void> {
  const logger = new JsonLogger(loadConfiguration().LOG_LEVEL);
  const application = await NestFactory.create(AppModule, { logger });
  const configuration = application.get<Configuration>(CONFIGURATION);

  const storageGateway = application.get<StorageGateway>(STORAGE_GATEWAY);
  await storageGateway.ensureWritable();
  await application.get(HealthResolver).recordStartupStorageCheck();

  application.use(
    '/graphql',
    graphqlUploadExpress({ maxFileSize: configuration.MAX_UPLOAD_BYTES, maxFiles: 1 }),
  );
  application.useGlobalFilters(new MediaErrorFilter());
  application.enableShutdownHooks();

  await application.listen(configuration.PORT, LISTEN_ADDRESS);
  logger.log({
    msg: 'backend ready',
    address: LISTEN_ADDRESS,
    port: configuration.PORT,
    uploadsRoot: configuration.UPLOADS_DIR,
    maxUploadBytes: configuration.MAX_UPLOAD_BYTES,
  });
}

function describeBootstrapFailure(error: unknown): string {
  if (error instanceof Error) {
    return `bootstrap failed: ${error.message}\n${error.stack ?? ''}`;
  }
  return `bootstrap failed: ${String(error)}`;
}

void bootstrap().catch((error: unknown) => {
  process.stderr.write(`${describeBootstrapFailure(error)}\n`);
  process.exit(1);
});
