import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { UsersModule } from '../users/users.module';
import { S3Module } from '../common/s3/s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    UsersModule,
    S3Module,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
