import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ShippingCategory } from '../enums/category.enum';

@Schema({ timestamps: true, collection: 'default_shipping' })
export class CityPrice extends Document {
  @ApiProperty()
  @Prop({ required: true })
  city: string;

  @ApiProperty({
    enum: ShippingCategory,
    description: 'Shipping category (copart, iaai, manheim)',
  })
  @Prop({ required: true, enum: ShippingCategory })
  category: ShippingCategory;

  @ApiProperty({ description: 'Base price' })
  @Prop({ required: true, type: Number, min: 0 })
  base_price: number;

  @ApiProperty({ description: 'Last adjustment amount applied by admin' })
  @Prop({ type: Number, default: null })
  last_adjustment_amount: number;

  @ApiProperty({ description: 'Date when the last adjustment was made' })
  @Prop({ type: Date, default: null })
  last_adjustment_date: Date;
}

export const CityPriceSchema = SchemaFactory.createForClass(CityPrice);
CityPriceSchema.index({ city: 1, category: 1 }, { unique: true });
