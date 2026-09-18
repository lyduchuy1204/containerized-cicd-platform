import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CheckReadiness } from '../../application/use-cases/check-readiness';

@Controller()
export class HealthController {
  constructor(private readonly checkReadiness: CheckReadiness) {}

  @Get('healthz')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readyz')
  async readiness(@Res() response: Response): Promise<void> {
    const report = await this.checkReadiness.execute();
    response.status(report.isReady ? 200 : 503).json(report);
  }
}

