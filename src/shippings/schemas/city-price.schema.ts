import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * CityPrice Schema
 *
 * Represents the base shipping price for a city/category combination.
 * Admin creates and manages these base prices.
 */
@Schema({ timestamps: true })
export class CityPrice extends Document {
  @Prop({ required: true, index: true })
  city: string;

  @Prop({
    required: true,
    enum: ['copart', 'iaai', 'manheim'],
    index: true,
  })
  category: string;

  @Prop({ required: true, min: 0 })
  base_price: number;

  @Prop({ type: Number, default: null })
  last_adjustment_amount: number | null;

  @Prop({ type: Date, default: null })
  last_adjustment_date: Date | null;
}

export const CityPriceSchema = SchemaFactory.createForClass(CityPrice);

// Create compound index for efficient queries
CityPriceSchema.index({ city: 1, category: 1 }, { unique: true });
