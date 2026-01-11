import { Injectable, Logger } from '@nestjs/common';
import { put, del, HeadBlobResult, head } from '@vercel/blob';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlobService {
  private readonly logger = new Logger(BlobService.name);

  constructor(private configService: ConfigService) {}

  async upload(
    path: string,
    file: string | Buffer | Blob | ArrayBuffer | ReadableStream,
    contentType?: string,
  ) {
    this.logger.log(`Uploading file to Vercel Blob: ${path}`);
    try {
      const blob = await put(path, file, {
        access: 'public',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      this.logger.log(`Successfully uploaded file: ${blob.url}`);
      return blob;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to Vercel Blob: ${error.message}`,
      );
      throw error;
    }
  }

  async delete(url: string) {
    this.logger.log(`Deleting file from Vercel Blob: ${url}`);
    try {
      await del(url, {
        token: this.configService.get<string>('BLOB_READ_WRITE_TOKEN'),
      });
      this.logger.log(`Successfully deleted file: ${url}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from Vercel Blob: ${error.message}`,
      );
      throw error;
    }
  }

  async getMetadata(url: string): Promise<HeadBlobResult> {
    try {
      return await head(url, {
        token: this.configService.get<string>('BLOB_READ_WRITE_TOKEN'),
      });
    } catch (error) {
      this.logger.error(`Failed to get metadata for blob: ${url}`);
      throw error;
    }
  }
}
