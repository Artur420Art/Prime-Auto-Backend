import { Module, Global } from '@nestjs/common';
import { BlobService } from './blob.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [BlobService],
  exports: [BlobService],
})
export class BlobModule {}
