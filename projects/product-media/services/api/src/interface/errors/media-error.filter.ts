import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { httpStatusForCode, isClientCode } from '../../domain/error-code';
import { MediaError } from '../../domain/media-error';

@Catch(MediaError)
export class MediaErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(MediaErrorFilter.name);

  catch(exception: MediaError, host: ArgumentsHost): void {
    const status = httpStatusForCode(exception.code);
    if (isClientCode(exception.code)) {
      this.logger.log({ msg: 'request rejected', code: exception.code });
    } else {
      this.logger.error({ msg: 'request failed', code: exception.code });
    }
    if (host.getType<string>() !== 'http') {
      throw exception;
    }
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ code: exception.code, message: exception.message });
  }
}

