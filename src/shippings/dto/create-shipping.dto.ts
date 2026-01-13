import { IsString, IsNumber, IsEnum, Min } from 'class-validator';

export class CreateCityPriceDto {
  @IsString()
  city: string;

  @IsEnum(['copart', 'iaai', 'manheim'], {
    message: 'Category must be one of: copart, iaai, manheim',
  })
  category: string;

  @IsNumber()
  @Min(0, { message: 'Base price must be greater than or equal to 0' })
  base_price: number;
}
