import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCityPriceDto {
  @ApiProperty({ description: 'New base price from PDF' })
  @IsNumber()
  @Min(0)
  base_price: number;
}
