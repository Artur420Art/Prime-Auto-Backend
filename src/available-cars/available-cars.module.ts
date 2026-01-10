import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AvailableCarsService } from './available-cars.service';
import { AvailableCarsController } from './available-cars.controller';
import {
  AvailableCar,
  AvailableCarSchema,
} from './schemas/available-car.schema';
import { S3Module } from '../common/s3/s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AvailableCar.name, schema: AvailableCarSchema },
    ]),
    S3Module,
  ],
  controllers: [AvailableCarsController],
  providers: [AvailableCarsService],
  exports: [AvailableCarsService],
})
export class AvailableCarsModule {}
