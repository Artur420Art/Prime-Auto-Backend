import { Injectable } from '@nestjs/common';

import { S3Service } from '../common/s3/s3.service';

@Injectable()
export class FilesService {
  constructor(private readonly s3Service: S3Service) {}

  getObjectByKey = async ({ key }: { key: string }) => {
    return await this.s3Service.getObject({ key });
  };

  getObjectByUrl = async ({ url }: { url: string }) => {
    const key = this.s3Service.extractKeyFromUrl(url);
    return await this.s3Service.getObject({ key });
  };
}
