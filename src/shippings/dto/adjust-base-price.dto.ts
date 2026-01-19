import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

/**
 * AdjustBasePriceDto
 *
 * Used by admin to adjust base prices for a category.
 * The adjustment_amount will be SET as the adjustment from the default_price (can be negative).
 *
 * Example:
 * If default_price is 100:
 * 1. "adjustment_amount": 200 -> base_price becomes 300 (100 + 200)
 * 2. "adjustment_amount": 300 -> base_price becomes 400 (100 + 300)
 *
 * This ensures the adjustment is always calculated from the original default price.
 */
export class AdjustBasePriceDto {
  @IsEnum(['copart', 'iaai', 'manheim'], {
    message: 'Category must be one of: copart, iaai, manheim',
  })
  category: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsNumber()
  adjustment_amount: number;
}
