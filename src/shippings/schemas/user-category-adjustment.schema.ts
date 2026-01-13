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
 * - adjustment_amount: Current adjustment (+/- amount)
 * - adjusted_by: Who made the adjustment (admin or user)
 * - last_adjustment_amount: Previous adjustment value (for history)
 * - last_adjustment_date: When the last adjustment was made
 * 
 * Example:
 * If user has adjustment_amount=50 for "copart",
 * all copart cities will have +50 added to their base price for that user.
 */
@Schema({ timestamps: true })
export class UserCategoryAdjustment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: ['copart', 'iaai', 'manheim'],
    index: true 
  })
  category: string;

  @Prop({ required: true, default: 0 })
  adjustment_amount: number;

  @Prop({ 
    type: String, 
    enum: Object.values(AdjustedBy),
    default: AdjustedBy.USER 
  })
  adjusted_by: AdjustedBy;

  @Prop({ type: Number, default: null })
  last_adjustment_amount: number | null;

  @Prop({ type: Date, default: null })
  last_adjustment_date: Date | null;
}

export const UserCategoryAdjustmentSchema = SchemaFactory.createForClass(
  UserCategoryAdjustment,
);

// Create compound index to ensure one adjustment per user per category
UserCategoryAdjustmentSchema.index(
  { user: 1, category: 1 }, 
  { unique: true }
);
