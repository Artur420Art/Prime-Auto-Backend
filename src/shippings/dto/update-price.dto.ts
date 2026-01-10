import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustUserPricesDto {
  @ApiProperty({
    description:
      'Amount to adjust all city prices (+ to increase, - to decrease)',
    example: 50,
  })
  @IsNumber()
  adjustment_amount: number;
}
