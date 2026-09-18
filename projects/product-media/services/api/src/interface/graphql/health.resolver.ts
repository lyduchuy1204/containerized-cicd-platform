import { Inject, Injectable } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { CheckReadiness } from '../../application/use-cases/check-readiness';
import { STORAGE_GATEWAY, StorageGateway } from '../../application/ports/storage-gateway';
import { HealthStatusType } from './health-status.type';

@Injectable()
@Resolver(() => HealthStatusType)
export class HealthResolver {
  private storageWritable = false;

  constructor(
    private readonly checkReadiness: CheckReadiness,
    @Inject(STORAGE_GATEWAY) private readonly storageGateway: StorageGateway,
  ) {}

  async recordStartupStorageCheck(): Promise<void> {
    try {
      await this.storageGateway.ensureWritable();
      this.storageWritable = true;
    } catch {
      this.storageWritable = false;
    }
  }

  @Query(() => HealthStatusType, { name: 'health' })
  async health(): Promise<HealthStatusType> {
    const report = await this.checkReadiness.execute();
    return {
      status: report.isReady ? 'ok' : 'degraded',
      database: report.database,
      queue: report.queue,
      storage: this.storageWritable,
    };
  }
}

