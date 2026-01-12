import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ShippingCategory } from '../enums/category.enum';

export class AdjustPriceDto {
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

  @ApiProperty({
    description: 'User ID (Admin only - if not provided, adjusts own price)',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
