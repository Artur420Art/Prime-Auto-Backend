import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ShippingsController } from './shippings.controller';
import { ShippingsService } from './shippings.service';
import { CityPrice, CityPriceSchema } from './schemas/city-price.schema';
import {
  UserCategoryAdjustment,
  UserCategoryAdjustmentSchema,
} from './schemas/user-category-adjustment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CityPrice.name, schema: CityPriceSchema },
      {
        name: UserCategoryAdjustment.name,
        schema: UserCategoryAdjustmentSchema,
      },
    ]),
  ],
  controllers: [ShippingsController],
  providers: [ShippingsService],
  exports: [ShippingsService],
})
export class ShippingsModule {}
