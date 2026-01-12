import { IsNumber, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ShippingCategory } from '../enums/category.enum';

export class AdminAdjustUserPriceDto {
  @ApiProperty({ description: 'User ID to adjust price for' })
  @IsString()
  userId: string;

  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category to adjust',
  })
  @IsEnum(ShippingCategory)
  category: ShippingCategory;

  @ApiProperty({
    description: 'Adjustment amount (+ to increase, - to decrease)',
    example: 50,
  })
  @IsNumber()
  adjustment_amount: number;
}
