import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AdjustedBy {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * UserCategoryAdjustment Schema
 * 
 * Represents a user's price adjustment for an entire category.
 * This adjustment applies to ALL cities in that category for the user.
 * 
 * Fields:
 * - user: Reference to User
 * - category: Auction category (copart, iaai, manheim)
 * - user_adjustment_amount: Adjustment set by the user themselves
 * - admin_adjustment_amount: Adjustment set by admin for this user
 * - adjusted_by: Who made the last adjustment (admin or user)
 * 
 * Example:
 * If user has user_adjustment_amount=50 and admin_adjustment_amount=100 for "copart",
 * all copart cities will have +150 added to their base price for that user.
 */
@Schema({ timestamps: true, collection: 'user_category_adjustments'})
export class UserCategoryAdjustment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: ['copart', 'iaai', 'manheim'],
    index: true 
  })
  category: string;

  // User's own adjustment amount
  @Prop({ required: true, default: 0 })
  user_adjustment_amount: number;

  // Admin's adjustment amount for this user
  @Prop({ required: true, default: 0 })
  admin_adjustment_amount: number;

  @Prop({ 
    type: String, 
    enum: Object.values(AdjustedBy),
    default: AdjustedBy.USER 
  })
  adjusted_by: AdjustedBy;
}

export const UserCategoryAdjustmentSchema = SchemaFactory.createForClass(
  UserCategoryAdjustment,
);

// Create compound index to ensure one adjustment per user per category
UserCategoryAdjustmentSchema.index(
  { user: 1, category: 1 }, 
  { unique: true }
);
