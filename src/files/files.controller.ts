import type { Readable } from 'node:stream';

import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/enums/role.enum';

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

  @Delete('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete all images from S3 (Admin only)',
    description:
      'Permanently deletes all images from the S3 bucket. This operation cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'All images deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async deleteAllImages() {
    const result = await this.filesService.deleteAllImages();
    return {
      message: 'All images deleted successfully',
      deletedCount: result.deletedCount,
    };
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
