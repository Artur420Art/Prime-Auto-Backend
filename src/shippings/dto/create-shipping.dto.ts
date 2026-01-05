import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShippingDto {
  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  shipping: number;
}

export class IncreaseAllAmmountDto {
  @ApiProperty()
  @IsNumber()
  ammount: number
}