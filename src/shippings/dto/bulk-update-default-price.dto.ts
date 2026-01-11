import { IsNumber, IsString, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingCategory } from '../enums/category.enum';

export class BulkUpdateDefaultPriceDto {
  @ApiProperty({
    description:
      'City name (optional - if not provided, applies to all cities)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    enum: ShippingCategory,
    description:
      'Shipping category (optional - if not provided, applies to all categories)',
    required: false,
  })
  @IsOptional()
  @IsEnum(ShippingCategory)
  category?: ShippingCategory;

  @ApiProperty({ description: 'Default price to set for all matching records' })
  @IsNumber()
  @Min(0)
  default_price: number;
}
