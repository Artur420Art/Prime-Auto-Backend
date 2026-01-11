import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
        'Missing S3 env variables: AWS_S3_BUCKET_NAME, AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY',
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
      forcePathStyle: false, // ✅ MUST be false for Railway
    });

    this.logger.log('✅ S3 Client initialized for Railway S3');
  }

  // Upload a file and return a presigned URL (valid for 7 days)
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

      // Generate a presigned URL valid for 7 days (604800 seconds)
      const url = await this.getPresignedUrl(key, 604800);
      this.logger.log(`✅ File uploaded successfully with presigned URL`);
      return { url, key };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Upload failed: ${message}`, stack);
      throw err;
    }
  }

  // Upload multiple files in parallel for better performance
  async uploadBatch({
    files,
  }: {
    files: Array<{
      key: string;
      file: Buffer;
      contentType?: string;
    }>;
  }): Promise<Array<{ url: string; key: string }>> {
    this.logger.log(`Uploading ${files.length} files to S3 in parallel`);

    try {
      // Upload all files in parallel
      const uploadPromises = files.map(({ key, file, contentType }) =>
        this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file,
            ContentType: contentType,
          }),
        ),
      );

      await Promise.all(uploadPromises);

      // Generate presigned URLs in parallel
      const urlPromises = files.map(({ key }) =>
        this.getPresignedUrl(key, 604800).then((url) => ({ url, key })),
      );

      const results = await Promise.all(urlPromises);
      this.logger.log(`✅ Successfully uploaded ${files.length} files`);
      return results;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Batch upload failed: ${message}`, stack);
      throw err;
    }
  }

  // Generate a presigned URL for accessing a file
  async getPresignedUrl(
    key: string,
    expiresIn: number = 604800,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getObject = async ({ key }: { key: string }) => {
    const data = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    return {
      body: data.Body,
      contentType: data.ContentType,
      contentLength: data.ContentLength,
      cacheControl: data.CacheControl,
      eTag: data.ETag,
      lastModified: data.LastModified,
    };
  };

  // Delete a file
  async delete(key: string): Promise<void> {
    this.logger.log(`Deleting file from S3: ${key}`);
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Delete failed: ${message}`, stack);
      throw err;
    }
  }

  // Delete multiple files in parallel for better performance
  async deleteBatch(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    this.logger.log(`Deleting ${keys.length} files from S3 in parallel`);
    try {
      const deletePromises = keys.map((key) =>
        this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
        ),
      );

      await Promise.all(deletePromises);
      this.logger.log(`✅ Successfully deleted ${keys.length} files`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Batch delete failed: ${message}`, stack);
      throw err;
    }
  }

  // Check if a file exists
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (err: unknown) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
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
