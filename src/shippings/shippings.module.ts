import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingsService } from './shippings.service';
import { ShippingsController } from './shippings.controller';
import { UserShipping, UserShippingSchema } from './schemas/shipping.schema';
import { CityPrice, CityPriceSchema } from './schemas/city-price.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserShipping.name, schema: UserShippingSchema },
      { name: CityPrice.name, schema: CityPriceSchema },
    ]),
  ],
  controllers: [ShippingsController],
  providers: [ShippingsService],
  exports: [ShippingsService],
})
export class ShippingsModule {}
