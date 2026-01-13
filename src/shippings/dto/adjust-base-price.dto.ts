import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

/**
 * AdjustBasePriceDto
 * 
 * Used by admin to adjust base prices for a category.
 * The adjustment_amount will be ADDED to existing base prices (can be negative).
 * 
 * Example:
 * {
 *   "category": "copart",
 *   "adjustment_amount": 100  // Adds $100 to all copart cities
 * }
 * 
 * Or adjust specific city:
 * {
 *   "category": "copart",
 *   "city": "Los Angeles",
 *   "adjustment_amount": -50  // Reduces LA copart by $50
 * }
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
