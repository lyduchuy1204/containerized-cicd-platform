import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReadMediaFile } from '../../application/use-cases/read-media-file';
import { ByteRange } from '../../application/ports/storage-gateway';

@Controller('files')
export class MediaFileController {
  constructor(private readonly readMediaFile: ReadMediaFile) {}

  @Get(':mediaId/:filename')
  async download(
    @Param('mediaId') mediaId: string,
    @Param('filename') filename: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const range = this.parseRange(rangeHeader);
    const file = await this.readMediaFile.execute({ mediaId, filename, range });
    this.writeHeaders(response, file.contentType, file.sizeBytes, range);
    file.stream.pipe(response);
  }

  private parseRange(rangeHeader: string | undefined): ByteRange | undefined {
    if (rangeHeader === undefined || !rangeHeader.startsWith('bytes=')) {
      return undefined;
    }
    const [startText, endText] = rangeHeader.replace('bytes=', '').split('-');
    const start = Number(startText);
    if (Number.isNaN(start)) {
      return undefined;
    }
    const end = endText === '' ? undefined : Number(endText);
    return end === undefined || Number.isNaN(end) ? { start } : { start, end };
  }

  private writeHeaders(
    response: Response,
    contentType: string,
    sizeBytes: number,
    range?: ByteRange,
  ): void {
    response.setHeader('Content-Type', contentType);
    response.setHeader('Accept-Ranges', 'bytes');
    if (range === undefined) {
      response.setHeader('Content-Length', sizeBytes);
      return;
    }
    const end = range.end ?? sizeBytes - 1;
    response.status(206);
    response.setHeader('Content-Range', `bytes ${range.start}-${end}/${sizeBytes}`);
    response.setHeader('Content-Length', end - range.start + 1);
  }
}

