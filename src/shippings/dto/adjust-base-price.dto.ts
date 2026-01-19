import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

/**
 * AdjustBasePriceDto
 *
 * Used by admin to adjust base prices for a category.
 * The adjustment_amount will be ADDED to the current base prices (can be negative).
 *
 * Example:
 * {
 *   "category": "copart",
 *   "adjustment_amount": 100  // Adds $100 to all copart cities
 * }
 *
 * This means effective_base_price = default_price + cumulative_adjustments.
 * If you call it again with 50, the base_price increases by 50 more.
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
