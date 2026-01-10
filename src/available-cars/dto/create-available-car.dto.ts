import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { CarCategory } from '../enums/car-category.enum';
import { EngineType } from '../enums/engine-type.enum';
import { Transmission } from '../enums/transmission.enum';

export class CreateAvailableCarDto {
  @ApiProperty({ description: 'Car model', example: 'Toyota Camry' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  carModel: string;

  @ApiProperty({ description: 'Car year', example: 2022 })
  @IsNumber()
  @Type(() => Number)
  @Min(1900)
  carYear: number;

  @ApiProperty({ description: 'Car VIN', example: '1HGBH41JXMN109186' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  carVin: string;

  @ApiProperty({ description: 'Car price in USD', example: 25000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  carPrice: number;

  @ApiProperty({
    enum: CarCategory,
    description: 'Car category',
    example: CarCategory.AVAILABLE,
  })
  @IsEnum(CarCategory)
  carCategory: CarCategory;

  @ApiPropertyOptional({
    description: 'Car description',
    example: 'Well maintained, low mileage',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  carDescription?: string;

  @ApiPropertyOptional({
    enum: EngineType,
    description: 'Engine type',
    example: EngineType.GASOLINE,
  })
  @IsOptional()
  @IsEnum(EngineType)
  engineType?: EngineType;

  @ApiPropertyOptional({ description: 'Engine horsepower', example: 250 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  engineHp?: number;

  @ApiPropertyOptional({
    description: 'Engine size in liters',
    example: 2.5,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  engineSize?: number;

  @ApiPropertyOptional({
    description: 'Place where the car was bought',
    example: 'Los Angeles, CA',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(200)
  boughtPlace?: string;

  @ApiPropertyOptional({
    enum: Transmission,
    description: 'Transmission type',
    example: Transmission.AUTOMATIC,
  })
  @IsOptional()
  @IsEnum(Transmission)
  transmission?: Transmission;
}
