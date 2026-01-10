import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CarCategory } from '../enums/car-category.enum';

export class CategoryFilterDto {
  @ApiPropertyOptional({
    enum: CarCategory,
    description: 'Filter by car category',
  })
  @IsOptional()
  @IsEnum(CarCategory)
  carCategory?: CarCategory;
}
