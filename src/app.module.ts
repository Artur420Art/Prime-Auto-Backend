import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ShippingsModule } from './shippings/shippings.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { BlobModule } from './common/blob/blob.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    ShippingsModule,
    ExchangeRateModule,
    BlobModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
