import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShippingDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNumber()
  shipping: number;
}
