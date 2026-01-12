import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ShippingCategory } from '../enums/category.enum';

export class AdjustBasePriceDto {
  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category (required)',
  })
  @IsEnum(ShippingCategory)
  category: ShippingCategory;

  @ApiProperty({
    description:
      'City name (optional - if not provided, applies to all cities in the category)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description:
      'Amount to adjust base price (+ to increase, - to decrease)',
    example: 50,
  })
  @IsNumber()
  adjustment_amount: number;
}
