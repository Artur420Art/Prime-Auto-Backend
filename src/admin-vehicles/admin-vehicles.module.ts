import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminVehiclesController } from './admin-vehicles.controller';
import { AdminVehiclesService } from './admin-vehicles.service';
import {
  AdminVehicle,
  AdminVehicleSchema,
} from './schemas/admin-vehicle.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminVehicle.name, schema: AdminVehicleSchema },
    ]),
  ],
  controllers: [AdminVehiclesController],
  providers: [AdminVehiclesService],
  exports: [AdminVehiclesService],
})
export class AdminVehiclesModule {}
