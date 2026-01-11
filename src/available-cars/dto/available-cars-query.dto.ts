import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CarCategory } from '../enums/car-category.enum';

export class AvailableCarsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CarCategory,
    description: 'Filter by car category',
  })
  @IsOptional()
  @IsEnum(CarCategory)
  carCategory?: CarCategory;
}
