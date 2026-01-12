import { IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ShippingCategory } from '../enums/category.enum';

export class AdjustUserPricesDto {
  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category to adjust',
  })
  @IsEnum(ShippingCategory)
  category: ShippingCategory;

  @ApiProperty({
    description:
      'Amount to adjust city prices for the category (+ to increase, - to decrease)',
    example: 50,
  })
  @IsNumber()
  adjustment_amount: number;
}
