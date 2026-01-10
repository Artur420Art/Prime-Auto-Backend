import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';
import { ShippingCategory } from '../enums/category.enum';

@Schema({ timestamps: true, collection: 'user_shipping' })
export class UserShipping extends Document {
  @ApiProperty({ type: String })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @ApiProperty()
  @Prop({ required: true })
  city: string;

  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category (copart, iaai, manheim)',
  })
  @Prop({ required: true, enum: ShippingCategory })
  category: ShippingCategory;

  @ApiProperty({
    description:
      'Default price for this user (initially set from base_price, can be modified by admin)',
  })
  @Prop({ required: true, type: Number, min: 0 })
  default_price: number;

  @ApiProperty({
    description: 'Current price adjustment amount set by user (+ or -)',
  })
  @Prop({ type: Number, default: 0 })
  price_adjustment: number;

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

  @ApiProperty({
    description:
      'Current calculated shipping price (default_price + price_adjustment)',
  })
  @Prop({ type: Number, min: 0, default: null })
  current_price: number;
}

export const UserShippingSchema = SchemaFactory.createForClass(UserShipping);

// Indexes for performance optimization
UserShippingSchema.index({ user: 1, city: 1, category: 1 }, { unique: true });
UserShippingSchema.index({ user: 1 });
UserShippingSchema.index({ city: 1 });
UserShippingSchema.index({ category: 1 });
