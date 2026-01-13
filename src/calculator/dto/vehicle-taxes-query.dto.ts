import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class VehicleTaxesQueryDto {
  @ApiProperty({
    description: 'Vehicle value/price (EUR) (maps to src.am "value")',
    example: 12142,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Engine volume (maps to src.am "volume")',
    example: 231,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  volume: number;

  @ApiProperty({
    description: 'Engine type id (maps to src.am "selectedEngineType")',
    example: 1,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  engineType: number;

  @ApiProperty({
    description:
      'Date. Accepts DD-MM-YYYY (e.g. 27-01-2026), YYYY-MM-DD, or a full ISO timestamp.',
    example: '27-01-2026',
  })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiPropertyOptional({
    description: 'isLegal flag (0/1). Default: 1',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  isLegal?: number = 1;

  @ApiPropertyOptional({
    description: 'offRoad flag (0/1). Default: 0',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  offRoad?: number = 0;

  @ApiPropertyOptional({
    description: 'ICEpower flag (0/1). Default: 0',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  ICEpower?: number = 0;
}

