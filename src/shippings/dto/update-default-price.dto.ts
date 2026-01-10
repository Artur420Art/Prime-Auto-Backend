import { IsNumber, IsString, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingCategory } from '../enums/category.enum';

export class UpdateDefaultPriceDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'City name' })
  @IsString()
  city: string;

  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category (copart, iaai, manheim)',
  })
  @IsEnum(ShippingCategory)
  category: ShippingCategory;

  @ApiProperty({ description: 'Default price set by admin' })
  @IsNumber()
  @Min(0)
  default_price: number;
}
