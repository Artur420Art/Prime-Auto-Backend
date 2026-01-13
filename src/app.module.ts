import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ShippingsModule } from './shippings/shippings.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { BlobModule } from './common/blob/blob.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminVehiclesModule } from './admin-vehicles/admin-vehicles.module';
import { AvailableCarsModule } from './available-cars/available-cars.module';
import { S3Module } from './common/s3/s3.module';
import { HealthModule } from './health/health.module';
import { FilesModule } from './files/files.module';
import { CalculatorModule } from './calculator/calculator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    AdminVehiclesModule,
    ShippingsModule,
    ExchangeRateModule,
    BlobModule,
    S3Module,
    NotificationsModule,
    AvailableCarsModule,
    HealthModule,
    FilesModule,
    CalculatorModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
