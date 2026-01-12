import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { User } from '../../users/schemas/user.schema';
import { ShippingCategory } from '../enums/category.enum';

export enum AdjustedBy {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema({ timestamps: true, collection: 'user_category_adjustments' })
export class UserCategoryAdjustment extends Document {
  @ApiProperty({ type: String })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category (copart, iaai, manheim)',
  })
  @Prop({ required: true, enum: ShippingCategory })
  category: ShippingCategory;

  @ApiProperty({
    description: 'Current adjustment amount for this category (+ or -)',
  })
  @Prop({ type: Number, default: 0 })
  adjustment_amount: number;

  @ApiProperty({
    enum: AdjustedBy,
    description: 'Who made the adjustment (user or admin)',
  })
  @Prop({ type: String, enum: AdjustedBy, default: AdjustedBy.USER })
  adjusted_by: AdjustedBy;

  @ApiProperty({
    description: 'Previous adjustment amount (for tracking history)',
  })
  @Prop({ type: Number, default: null })
  last_adjustment_amount: number;

  @ApiProperty({
    description: 'Date when the last adjustment was made',
  })
  @Prop({ type: Date, default: null })
  last_adjustment_date: Date;
}

export const UserCategoryAdjustmentSchema = SchemaFactory.createForClass(
  UserCategoryAdjustment,
);

// Unique index: one adjustment per user per category
UserCategoryAdjustmentSchema.index({ user: 1, category: 1 }, { unique: true });
