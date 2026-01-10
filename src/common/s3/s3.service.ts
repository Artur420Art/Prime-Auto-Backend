import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor() {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const endpoint = process.env.AWS_ENDPOINT_URL;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION;
    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing S3 env variables: S3_BUCKET_NAME, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY',
      );
    }

    this.bucketName = bucket;
    this.endpoint = endpoint.replace(/\/$/, '');

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: region ?? 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async upload({
                 key,
                 file,
                 contentType,
               }: {
    key: string;
    file: Buffer;
    contentType?: string;
  }): Promise<{ url: string; key: string }> {
    this.logger.log(`Uploading file to S3: ${key}`);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file,
          ContentType: contentType,
        }),
      );

      const url = `${this.endpoint}/${this.bucketName}/${key}`;
      return { url, key };
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    this.logger.log(`Deleting file from S3: ${key}`);

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      if (status === 404 || status === 403) {
        return false;
      }
      throw err;
    }
  }

  extractKeyFromUrl(url: string): string {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);

    if (parts[0] === this.bucketName) {
      parts.shift();
    }

    return parts.join('/');
  }
}
