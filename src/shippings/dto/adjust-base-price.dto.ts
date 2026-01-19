import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

/**
 * AdjustBasePriceDto
 *
 * Used by admin to adjust base prices for a category.
 * The adjustment_amount will be SET as the current adjustment from the base price (can be negative).
 *
 * Example:
 * {
 *   "category": "copart",
 *   "adjustment_amount": 100  // Sets adjustment to $100 for all copart cities
 * }
 *
 * This means effective_base_price = base_price + adjustment_amount.
 * If you call it again with 150, effective_base_price becomes base_price + 150 (NOT base_price + 100 + 150).
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
