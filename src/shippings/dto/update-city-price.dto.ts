import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class UpdateCityPriceDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(['copart', 'iaai', 'manheim'], {
    message: 'Category must be one of: copart, iaai, manheim',
  })
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Base price must be greater than or equal to 0' })
  base_price?: number;
}
