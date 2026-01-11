import type { Readable } from 'node:stream';

import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { FilesService } from './files.service';

const isNodeReadable = (value: unknown): value is Readable => {
  return (
    !!value &&
    typeof value === 'object' &&
    'pipe' in value &&
    typeof (value as { pipe?: unknown }).pipe === 'function'
  );
};

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async getByUrl(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      throw new BadRequestException('Missing "url" query param');
    }

    return await this.streamFromS3({
      res,
      getObject: () => this.filesService.getObjectByUrl({ url }),
    });
  }

  @Get('*key')
  async getByKey(@Param('key') key: string, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException('Missing "key" param');
    }

    return await this.streamFromS3({
      res,
      getObject: () => this.filesService.getObjectByKey({ key }),
    });
  }

  private async streamFromS3({
    res,
    getObject,
  }: {
    res: Response;
    getObject: () => Promise<{
      body: unknown;
      contentType?: string;
      contentLength?: number;
      cacheControl?: string;
      eTag?: string;
      lastModified?: Date;
    }>;
  }) {
    try {
      const obj = await getObject();

      if (!isNodeReadable(obj.body)) {
        throw new BadRequestException('Unsupported S3 body stream type');
      }

      if (obj.contentType) res.setHeader('Content-Type', obj.contentType);
      if (typeof obj.contentLength === 'number') {
        res.setHeader('Content-Length', obj.contentLength.toString());
      }
      if (obj.cacheControl) {
        res.setHeader('Cache-Control', obj.cacheControl);
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      if (obj.eTag) res.setHeader('ETag', obj.eTag);
      if (obj.lastModified) {
        res.setHeader('Last-Modified', obj.lastModified.toUTCString());
      }

      obj.body.pipe(res);
      return;
    } catch (err: unknown) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      const name = (err as { name?: string })?.name;

      if (status === 404 || name === 'NoSuchKey' || name === 'NotFound') {
        throw new NotFoundException('File not found');
      }

      throw err;
    }
  }
}
