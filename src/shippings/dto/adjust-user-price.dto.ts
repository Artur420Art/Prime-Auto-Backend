import { IsString, IsNumber, IsEnum, IsOptional, IsMongoId } from 'class-validator';

/**
 * AdjustPriceDto
 * 
 * Used to adjust a user's price for a category.
 * - Admin can provide userId to adjust any user
 * - Regular user can only adjust their own (userId ignored)
 * 
 * The adjustment applies to ALL cities in that category for the user.
 * 
 * Example (Admin adjusting user's price):
 * {
 *   "userId": "user123",
 *   "category": "copart",
 *   "adjustment_amount": -30  // User gets $30 discount on all copart cities
 * }
 * 
 * Example (User adjusting own price):
 * {
 *   "category": "iaai",
 *   "adjustment_amount": 20  // Adds $20 to all iaai cities
 * }
 */
export class AdjustPriceDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsEnum(['copart', 'iaai', 'manheim'], {
    message: 'Category must be one of: copart, iaai, manheim',
  })
  category: string;

  @IsNumber()
  adjustment_amount: number;
}
